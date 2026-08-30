-- Contact/lead form submissions from the public contact page.
-- Inserts happen via the service-role client from the /api/contact route
-- (after reCAPTCHA verification), so there is no public insert policy.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "contact_messages_select_admin" on public.contact_messages
  for select using (public.is_admin());
create policy "contact_messages_update_admin" on public.contact_messages
  for update using (public.is_admin());
create policy "contact_messages_delete_admin" on public.contact_messages
  for delete using (public.is_admin());
