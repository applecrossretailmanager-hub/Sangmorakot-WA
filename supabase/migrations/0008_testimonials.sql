create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quote text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create policy "testimonials_select_active_or_admin" on public.testimonials
  for select using (active or public.is_admin());
create policy "testimonials_write_admin" on public.testimonials
  for insert with check (public.is_admin());
create policy "testimonials_update_admin" on public.testimonials
  for update using (public.is_admin());
create policy "testimonials_delete_admin" on public.testimonials
  for delete using (public.is_admin());
