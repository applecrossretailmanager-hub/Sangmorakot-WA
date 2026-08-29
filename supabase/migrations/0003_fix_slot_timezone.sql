-- pt_availability start_time/end_time are wall-clock times in the gym's local
-- timezone (Australia/Perth). Convert to UTC using AT TIME ZONE instead of
-- casting straight to timestamptz (which would assume server/UTC time).
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
    cross join generate_series(
      date_trunc('day', p_from at time zone 'Australia/Perth'),
      date_trunc('day', p_to at time zone 'Australia/Perth'),
      interval '1 day'
    ) gs
    where a.trainer_id = p_trainer_id
      and a.active = true
      and extract(dow from gs) = a.day_of_week
  ),
  slots as (
    select
      ((windows.day + windows.start_time) at time zone 'Australia/Perth')
        + (n * (windows.slot_minutes || ' minutes')::interval) as start_at,
      ((windows.day + windows.start_time) at time zone 'Australia/Perth')
        + ((n + 1) * (windows.slot_minutes || ' minutes')::interval) as end_at
    from windows
    cross join lateral generate_series(
      0,
      floor(extract(epoch from (windows.end_time - windows.start_time)) / 60 / windows.slot_minutes)::int - 1
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

revoke all on function public.get_open_pt_slots(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_open_pt_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
