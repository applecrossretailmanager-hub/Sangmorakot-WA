-- Admin-controlled toggle for which Stripe payment methods are offered at
-- checkout. Cash is always available and isn't gated here. A singleton row
-- (id is always `true`) keeps this simple to read/update.
create table public.payment_settings (
  id boolean primary key default true,
  card_enabled boolean not null default false,
  becs_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint payment_settings_singleton check (id = true)
);

insert into public.payment_settings (id, card_enabled, becs_enabled) values (true, false, false);

alter table public.payment_settings enable row level security;

create policy "payment_settings_select_public" on public.payment_settings
  for select using (true);
create policy "payment_settings_update_admin" on public.payment_settings
  for update using (public.is_admin());
