-- Point user_id / received_by foreign keys at public.profiles instead of
-- auth.users so PostgREST can embed profile data in a single select (e.g.
-- `.select("*, profile:profiles(full_name)")`) from the admin dashboard.
-- profiles.id already references auth.users(id) on delete cascade, so
-- referential integrity to the auth user is preserved transitively.

alter table public.memberships
  drop constraint memberships_user_id_fkey,
  add constraint memberships_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.pt_purchases
  drop constraint pt_purchases_user_id_fkey,
  add constraint pt_purchases_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.pt_bookings
  drop constraint pt_bookings_user_id_fkey,
  add constraint pt_bookings_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.payments
  drop constraint payments_user_id_fkey,
  add constraint payments_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade,
  drop constraint payments_received_by_fkey,
  add constraint payments_received_by_fkey
    foreign key (received_by) references public.profiles(id);
