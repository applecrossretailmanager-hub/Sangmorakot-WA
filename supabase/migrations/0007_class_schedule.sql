-- Group class timetable: recurring weekly class templates, and per-date
-- bookings against them with a capacity cap (unlike PT slots, many members
-- can book the same occurrence, up to capacity).

create table public.class_schedule (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trainer_id uuid references public.pt_trainers(id),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  capacity integer not null default 10 check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index class_schedule_trainer_idx on public.class_schedule (trainer_id);

create table public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id uuid not null references public.class_schedule(id) on delete cascade,
  class_date date not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (schedule_id, class_date, user_id)
);

create index class_bookings_user_idx on public.class_bookings (user_id);
create index class_bookings_schedule_date_idx on public.class_bookings (schedule_id, class_date);

alter table public.class_schedule enable row level security;
alter table public.class_bookings enable row level security;

-- class_schedule: public read (it's a marketing timetable), admin manage
create policy "class_schedule_select_public" on public.class_schedule
  for select using (true);
create policy "class_schedule_write_admin" on public.class_schedule
  for insert with check (public.is_admin());
create policy "class_schedule_update_admin" on public.class_schedule
  for update using (public.is_admin());
create policy "class_schedule_delete_admin" on public.class_schedule
  for delete using (public.is_admin());

-- class_bookings: member sees/cancels own, admin sees/manages all. Inserts
-- go through book_class() below so capacity is enforced atomically.
create policy "class_bookings_select_own_or_admin" on public.class_bookings
  for select using (user_id = auth.uid() or public.is_admin());
create policy "class_bookings_update_own_or_admin" on public.class_bookings
  for update using (user_id = auth.uid() or public.is_admin());

-- ---------- public timetable lookup with live booked counts ----------
create or replace function public.get_class_occurrences(p_from date, p_to date)
returns table (
  schedule_id uuid,
  name text,
  description text,
  trainer_name text,
  class_date date,
  start_at timestamptz,
  end_at timestamptz,
  capacity integer,
  booked_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cs.id,
    cs.name,
    cs.description,
    t.name,
    gs::date,
    ((gs::date + cs.start_time) at time zone 'Australia/Perth'),
    ((gs::date + cs.start_time) at time zone 'Australia/Perth')
      + (cs.duration_minutes || ' minutes')::interval,
    cs.capacity,
    coalesce((
      select count(*) from public.class_bookings cb
      where cb.schedule_id = cs.id
        and cb.class_date = gs::date
        and cb.status = 'booked'
    ), 0)
  from public.class_schedule cs
  left join public.pt_trainers t on t.id = cs.trainer_id
  cross join generate_series(p_from, p_to, interval '1 day') gs
  where cs.active = true
    and extract(dow from gs) = cs.day_of_week
  order by gs::date, cs.start_time;
$$;

revoke all on function public.get_class_occurrences(date, date) from public;
grant execute on function public.get_class_occurrences(date, date) to anon, authenticated;

-- ---------- atomic capacity-checked booking ----------
create or replace function public.book_class(p_schedule_id uuid, p_class_date date)
returns public.class_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_schedule public.class_schedule;
  v_count int;
  v_booking public.class_bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_schedule
  from public.class_schedule
  where id = p_schedule_id and active = true
  for update;

  if v_schedule is null then
    raise exception 'class_not_found';
  end if;

  if extract(dow from p_class_date) <> v_schedule.day_of_week then
    raise exception 'invalid_date';
  end if;

  if ((p_class_date + v_schedule.start_time) at time zone 'Australia/Perth') < now() then
    raise exception 'class_in_past';
  end if;

  select count(*) into v_count
  from public.class_bookings
  where schedule_id = p_schedule_id
    and class_date = p_class_date
    and status = 'booked';

  if v_count >= v_schedule.capacity then
    raise exception 'class_full';
  end if;

  insert into public.class_bookings (user_id, schedule_id, class_date, status)
  values (v_uid, p_schedule_id, p_class_date, 'booked')
  on conflict (schedule_id, class_date, user_id)
    do update set status = 'booked'
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_class(uuid, date) from public;
grant execute on function public.book_class(uuid, date) to authenticated;

create or replace function public.cancel_class_booking(p_booking_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.class_bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_booking from public.class_bookings where id = p_booking_id for update;

  if v_booking is null then
    raise exception 'booking_not_found';
  end if;

  if v_booking.user_id <> v_uid and not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  update public.class_bookings
  set status = 'cancelled'
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.cancel_class_booking(uuid) from public;
grant execute on function public.cancel_class_booking(uuid) to authenticated;
