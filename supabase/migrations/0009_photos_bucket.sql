-- Public storage bucket for trainer/site photos, uploaded from the admin panel.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_public_read" on storage.objects
  for select using (bucket_id = 'photos');
create policy "photos_admin_write" on storage.objects
  for insert with check (bucket_id = 'photos' and public.is_admin());
create policy "photos_admin_update" on storage.objects
  for update using (bucket_id = 'photos' and public.is_admin());
create policy "photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'photos' and public.is_admin());
