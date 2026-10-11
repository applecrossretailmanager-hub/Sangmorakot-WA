-- ---------- liability waiver acceptance records ----------
create table public.waivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  version text not null default 'v1',
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

create index waivers_user_id_idx on public.waivers(user_id);

alter table public.waivers enable row level security;

create policy "waivers_select" on public.waivers
  for select using (user_id = auth.uid() or public.is_admin());

-- no insert/update/delete policies for regular users: rows are written only
-- by the handle_new_user trigger (security definer), making them immutable
-- once created.

-- ---------- record waiver acceptance alongside profile creation ----------
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

  if new.raw_user_meta_data ->> 'waiver_accepted_at' is not null then
    insert into public.waivers (user_id, full_name, version, accepted_at)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      coalesce(new.raw_user_meta_data ->> 'waiver_version', 'v1'),
      (new.raw_user_meta_data ->> 'waiver_accepted_at')::timestamptz
    );
  end if;

  return new;
end;
$$;
