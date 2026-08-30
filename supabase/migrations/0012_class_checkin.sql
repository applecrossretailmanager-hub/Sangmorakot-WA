-- Lets admins mark a member as checked in when they physically arrive
-- for a class, separate from whether they booked online.
alter table public.class_bookings add column checked_in_at timestamptz;
