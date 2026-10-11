-- True row deletion isn't reliably available to us for memberships/payments,
-- so give admins a "Remove" action that hides stale or test rows (old
-- cancelled memberships, mistaken test payments) from the admin lists
-- without touching the underlying financial record.
alter table public.memberships add column archived_at timestamptz;
alter table public.payments add column archived_at timestamptz;
