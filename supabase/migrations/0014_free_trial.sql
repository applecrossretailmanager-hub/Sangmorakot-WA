-- "Your first class is free" — automatically detected and granted on a
-- member's first-ever class booking (via book_class), once per account and
-- once per phone number, with no separate signup step needed.
alter table public.class_bookings add column is_free_trial boolean not null default false;
alter table public.profiles add column free_trial_claimed_at timestamptz;

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
  v_is_trial boolean := false;
  v_phone text;
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

  -- Free-trial eligibility: this is the member's first-ever class booking
  -- row of any kind, their account hasn't claimed a trial before, and no
  -- other account with the same phone number has either.
  select phone into v_phone from public.profiles where id = v_uid;

  if not exists (select 1 from public.class_bookings where user_id = v_uid)
     and not exists (
       select 1 from public.profiles
       where id = v_uid and free_trial_claimed_at is not null
     )
     and (
       v_phone is null or trim(v_phone) = '' or not exists (
         select 1 from public.profiles
         where phone = v_phone and id <> v_uid and free_trial_claimed_at is not null
       )
     )
  then
    v_is_trial := true;
  end if;

  insert into public.class_bookings (user_id, schedule_id, class_date, status, is_free_trial)
  values (v_uid, p_schedule_id, p_class_date, 'booked', v_is_trial)
  on conflict (schedule_id, class_date, user_id)
    do update set status = 'booked'
  returning * into v_booking;

  if v_is_trial then
    update public.profiles set free_trial_claimed_at = now() where id = v_uid;
  end if;

  return v_booking;
end;
$$;

revoke all on function public.book_class(uuid, date) from public;
grant execute on function public.book_class(uuid, date) to authenticated;
