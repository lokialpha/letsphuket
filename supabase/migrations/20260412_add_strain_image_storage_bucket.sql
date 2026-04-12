-- Add public storage bucket and policies for strain image uploads from admin.
-- Safe to run on existing databases.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'strain-images',
  'strain-images',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/svg+xml'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant usage on schema storage to anon, authenticated;
grant select on table storage.objects to anon, authenticated;
grant insert, update, delete on table storage.objects to authenticated;

alter table if exists storage.objects enable row level security;

drop policy if exists strain_images_public_read on storage.objects;
create policy strain_images_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'strain-images');

drop policy if exists strain_images_admin_insert on storage.objects;
create policy strain_images_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'strain-images'
  and public.is_admin()
);

drop policy if exists strain_images_admin_update on storage.objects;
create policy strain_images_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'strain-images'
  and public.is_admin()
)
with check (
  bucket_id = 'strain-images'
  and public.is_admin()
);

drop policy if exists strain_images_admin_delete on storage.objects;
create policy strain_images_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'strain-images'
  and public.is_admin()
);
