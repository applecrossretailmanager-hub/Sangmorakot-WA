-- Atomic booking: picks the oldest paid purchase with sessions left, decrements
-- it, and inserts the booking, all inside one transaction so a session can
-- never be spent without a booking (or vice versa) under concurrent requests.
create or replace function public.book_pt_session(
  p_trainer_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns public.pt_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_purchase_id uuid;
  v_booking public.pt_bookings;
  v_local_ts timestamp;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'invalid_time_range';
  end if;

  v_local_ts := p_start_at at time zone 'Australia/Perth';

  if not exists (
    select 1 from public.pt_availability a
    where a.trainer_id = p_trainer_id
      and a.active = true
      and a.day_of_week = extract(dow from v_local_ts)
      and v_local_ts::time >= a.start_time
      and v_local_ts::time < a.end_time
  ) then
    raise exception 'slot_not_available';
  end if;

  select id into v_purchase_id
  from public.pt_purchases
  where user_id = v_uid
    and status = 'paid'
    and sessions_remaining > 0
  order by created_at
  limit 1
  for update skip locked;

  if v_purchase_id is null then
    raise exception 'no_sessions_remaining';
  end if;

  update public.pt_purchases
  set sessions_remaining = sessions_remaining - 1
  where id = v_purchase_id;

  insert into public.pt_bookings (user_id, trainer_id, purchase_id, start_at, end_at)
  values (v_uid, p_trainer_id, v_purchase_id, p_start_at, p_end_at)
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_pt_session(uuid, timestamptz, timestamptz) from public;
grant execute on function public.book_pt_session(uuid, timestamptz, timestamptz) to authenticated;

-- Cancelling refunds the session back onto the purchase it was booked against.
create or replace function public.cancel_pt_booking(p_booking_id uuid)
returns public.pt_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.pt_bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_booking
  from public.pt_bookings
  where id = p_booking_id
  for update;

  if v_booking is null then
    raise exception 'booking_not_found';
  end if;

  if v_booking.user_id <> v_uid and not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  if v_booking.status <> 'booked' then
    raise exception 'booking_not_cancellable';
  end if;

  update public.pt_bookings
  set status = 'cancelled'
  where id = p_booking_id
  returning * into v_booking;

  if v_booking.purchase_id is not null then
    update public.pt_purchases
    set sessions_remaining = least(sessions_remaining + 1, sessions_total)
    where id = v_booking.purchase_id;
  end if;

  return v_booking;
end;
$$;

revoke all on function public.cancel_pt_booking(uuid) from public;
grant execute on function public.cancel_pt_booking(uuid) to authenticated;
