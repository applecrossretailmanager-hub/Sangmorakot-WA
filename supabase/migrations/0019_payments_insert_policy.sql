-- payments was missing an INSERT policy entirely, so every admin
-- "mark cash received" action (memberships, PT packages, and now
-- classes) was silently failing to write the actual payment row under
-- RLS, even though the underlying membership/purchase/booking row
-- updated fine.
create policy "payments_insert_admin" on public.payments
  for insert with check (public.is_admin());
