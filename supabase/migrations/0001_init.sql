-- Sangmorakot WA Muay Thai: core schema
-- profiles, membership plans/subscriptions, personal training packages/bookings, payments log

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'member' check (role in ('member', 'admin')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user; created automatically on signup.';

-- ---------- membership plans ----------
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'aud',
  interval text not null default 'month' check (interval in ('day', 'week', 'month', 'year')),
  interval_count integer not null default 1 check (interval_count > 0),
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- memberships (a member's subscription to a plan) ----------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id),
  status text not null default 'pending_cash'
    check (status in ('pending_cash', 'active', 'past_due', 'canceled', 'incomplete')),
  payment_method text not null check (payment_method in ('stripe', 'cash')),
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_status_idx on public.memberships (status);

-- ---------- personal training trainers ----------
create table public.pt_trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- weekly recurring availability windows per trainer ----------
create table public.pt_availability (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.pt_trainers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 60 check (slot_minutes > 0),
  active boolean not null default true,
  check (end_time > start_time)
);

create index pt_availability_trainer_idx on public.pt_availability (trainer_id);

-- ---------- purchasable personal training session packs ----------
create table public.pt_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  session_count integer not null check (session_count > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'aud',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- a member's purchase of a session pack ----------
create table public.pt_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.pt_packages(id),
  sessions_total integer not null,
  sessions_remaining integer not null,
  payment_method text not null check (payment_method in ('stripe', 'cash')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  created_at timestamptz not null default now()
);

create index pt_purchases_user_idx on public.pt_purchases (user_id);

-- ---------- individual booked sessions ----------
create table public.pt_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references public.pt_trainers(id),
  purchase_id uuid references public.pt_purchases(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'completed', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  unique (trainer_id, start_at)
);

create index pt_bookings_user_idx on public.pt_bookings (user_id);
create index pt_bookings_trainer_start_idx on public.pt_bookings (trainer_id, start_at);

-- ---------- payment / cash reconciliation log ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('membership', 'pt_package')),
  reference_id uuid,
  amount_cents integer not null,
  currency text not null default 'aud',
  method text not null check (method in ('stripe', 'cash')),
  stripe_event_id text,
  status text not null default 'succeeded' check (status in ('succeeded', 'pending', 'failed', 'refunded')),
  received_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index payments_user_idx on public.payments (user_id);

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.membership_plans
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- ---------- auto-create profile row on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- is_admin helper (security definer avoids recursive RLS) ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- available slot lookup (hides other members' identities) ----------
create or replace function public.get_open_pt_slots(
  p_trainer_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (start_at timestamptz, end_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  with windows as (
    select
      gs::date as day,
      a.day_of_week,
      a.start_time,
      a.end_time,
      a.slot_minutes
    from public.pt_availability a
    cross join generate_series(date_trunc('day', p_from), date_trunc('day', p_to), interval '1 day') gs
    where a.trainer_id = p_trainer_id
      and a.active = true
      and extract(dow from gs) = a.day_of_week
  ),
  slots as (
    select
      (day + start_time)::timestamptz
        + (n * (slot_minutes || ' minutes')::interval) as start_at,
      (day + start_time)::timestamptz
        + ((n + 1) * (slot_minutes || ' minutes')::interval) as end_at
    from windows
    cross join lateral generate_series(
      0,
      floor(extract(epoch from (end_time - start_time)) / 60 / slot_minutes)::int - 1
    ) as n
  )
  select s.start_at, s.end_at
  from slots s
  where s.start_at >= p_from
    and s.start_at < p_to
    and s.start_at > now()
    and not exists (
      select 1 from public.pt_bookings b
      where b.trainer_id = p_trainer_id
        and b.status = 'booked'
        and b.start_at = s.start_at
    )
  order by s.start_at;
$$;

grant execute on function public.get_open_pt_slots(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.pt_trainers enable row level security;
alter table public.pt_availability enable row level security;
alter table public.pt_packages enable row level security;
alter table public.pt_purchases enable row level security;
alter table public.pt_bookings enable row level security;
alter table public.payments enable row level security;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- membership_plans: public can see active plans, admins manage
create policy "plans_select_active_or_admin" on public.membership_plans
  for select using (active or public.is_admin());
create policy "plans_write_admin" on public.membership_plans
  for insert with check (public.is_admin());
create policy "plans_update_admin" on public.membership_plans
  for update using (public.is_admin());
create policy "plans_delete_admin" on public.membership_plans
  for delete using (public.is_admin());

-- memberships: member sees own, admin sees/manages all. Inserts happen via
-- server routes using the service role key, so no public insert policy.
create policy "memberships_select_own_or_admin" on public.memberships
  for select using (user_id = auth.uid() or public.is_admin());
create policy "memberships_update_admin" on public.memberships
  for update using (public.is_admin());

-- pt_trainers / pt_availability: public read, admin write
create policy "trainers_select_public" on public.pt_trainers
  for select using (true);
create policy "trainers_write_admin" on public.pt_trainers
  for insert with check (public.is_admin());
create policy "trainers_update_admin" on public.pt_trainers
  for update using (public.is_admin());
create policy "trainers_delete_admin" on public.pt_trainers
  for delete using (public.is_admin());

create policy "availability_select_public" on public.pt_availability
  for select using (true);
create policy "availability_write_admin" on public.pt_availability
  for insert with check (public.is_admin());
create policy "availability_update_admin" on public.pt_availability
  for update using (public.is_admin());
create policy "availability_delete_admin" on public.pt_availability
  for delete using (public.is_admin());

-- pt_packages: public sees active, admin manages
create policy "packages_select_active_or_admin" on public.pt_packages
  for select using (active or public.is_admin());
create policy "packages_write_admin" on public.pt_packages
  for insert with check (public.is_admin());
create policy "packages_update_admin" on public.pt_packages
  for update using (public.is_admin());
create policy "packages_delete_admin" on public.pt_packages
  for delete using (public.is_admin());

-- pt_purchases: member sees own, admin manages. Inserts via server routes.
create policy "purchases_select_own_or_admin" on public.pt_purchases
  for select using (user_id = auth.uid() or public.is_admin());
create policy "purchases_update_admin" on public.pt_purchases
  for update using (public.is_admin());

-- pt_bookings: member sees/creates own, admin sees/manages all
create policy "bookings_select_own_or_admin" on public.pt_bookings
  for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings_insert_own" on public.pt_bookings
  for insert with check (user_id = auth.uid());
create policy "bookings_update_own_or_admin" on public.pt_bookings
  for update using (user_id = auth.uid() or public.is_admin());

-- payments: member sees own, admin manages. Inserts via server routes.
create policy "payments_select_own_or_admin" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "payments_update_admin" on public.payments
  for update using (public.is_admin());
