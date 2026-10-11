-- Casual (non-covered) class bookings owe cash on the day, tracked right on
-- the booking row so admins can see and collect it. A booking is "covered"
-- (no charge) when it's a free trial, or the member has an active
-- membership whose period covers the class date (unlimited plans, or a
-- same-day Casual pass bought through the normal membership flow).
alter table public.class_bookings
  add column requires_payment boolean not null default false,
  add column amount_due_cents integer,
  add column currency text,
  add column paid_at timestamptz;

alter table public.payments drop constraint payments_type_check;
alter table public.payments add constraint payments_type_check
  check (type in ('membership', 'pt_package', 'class'));

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
  v_covered boolean;
  v_price int;
  v_currency text;
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

  if not v_is_trial then
    select exists (
      select 1 from public.memberships
      where user_id = v_uid and status = 'active'
        and (current_period_end is null or current_period_end::date >= p_class_date)
    ) into v_covered;

    if not v_covered then
      select price_cents, upper(currency) into v_price, v_currency
      from public.membership_plans
      where active = true and interval = 'day'
      order by sort_order asc
      limit 1;
    end if;
  end if;

  insert into public.class_bookings (
    user_id, schedule_id, class_date, status, is_free_trial,
    requires_payment, amount_due_cents, currency
  )
  values (
    v_uid, p_schedule_id, p_class_date, 'booked', v_is_trial,
    v_price is not null, v_price, v_currency
  )
  on conflict (schedule_id, class_date, user_id)
    do update set
      status = 'booked',
      requires_payment = excluded.requires_payment,
      amount_due_cents = excluded.amount_due_cents,
      currency = excluded.currency,
      paid_at = null
  returning * into v_booking;

  if v_is_trial then
    update public.profiles set free_trial_claimed_at = now() where id = v_uid;
  end if;

  return v_booking;
end;
$$;

revoke all on function public.book_class(uuid, date) from public;
grant execute on function public.book_class(uuid, date) to authenticated;
