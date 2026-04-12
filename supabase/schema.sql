-- Lets Phuket Supabase schema and seed data

create table if not exists public.strains (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  strain_type text not null check (lower(strain_type) in ('sativa', 'indica', 'hybrid')),
  short_description text not null,
  description_en text not null default '',
  description_mm text,
  terpenes text[] not null default '{}',
  mood_aroma text not null,
  image_url text,
  image_alt text,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.strains
  add column if not exists description_en text,
  add column if not exists description_mm text;

update public.strains
set description_en = short_description
where coalesce(btrim(description_en), '') = '';

alter table public.strains
  alter column description_en set default '',
  alter column description_en set not null;

create unique index if not exists strains_single_featured_idx
on public.strains ((1))
where is_featured;

create index if not exists strains_sort_order_idx on public.strains (sort_order);
create index if not exists strains_published_idx on public.strains (is_published);

create table if not exists public.merch_items (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  category text not null default 'Item',
  description text not null,
  bullet_points text[] not null default '{}',
  image_url text,
  image_alt text,
  cta_label text not null default 'In-store only',
  cta_url text,
  is_published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merch_sort_order_idx on public.merch_items (sort_order);
create index if not exists merch_published_idx on public.merch_items (is_published);

create table if not exists public.shop_profile (
  id integer primary key default 1 check (id = 1),
  name text not null default 'Lets Phuket',
  visit_lede text not null default '',
  address text not null default '',
  hours_text text not null default '',
  whatsapp_url text not null default '',
  map_embed_url text not null default '',
  map_note text not null default '',
  visit_note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

drop trigger if exists strains_set_updated_at on public.strains;
create trigger strains_set_updated_at
before update on public.strains
for each row
execute function public.set_updated_at();

drop trigger if exists merch_set_updated_at on public.merch_items;
create trigger merch_set_updated_at
before update on public.merch_items
for each row
execute function public.set_updated_at();

drop trigger if exists shop_profile_set_updated_at on public.shop_profile;
create trigger shop_profile_set_updated_at
before update on public.shop_profile
for each row
execute function public.set_updated_at();

create or replace function public.prevent_data_uri_strain_image_url()
returns trigger
language plpgsql
as $$
declare
  normalized_image_url text;
begin
  normalized_image_url := regexp_replace(coalesce(new.image_url, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');

  if normalized_image_url = '' then
    return new;
  end if;

  if lower(left(normalized_image_url, 5)) = 'data:' then
    if tg_op = 'INSERT' or new.image_url is distinct from old.image_url then
      raise exception using
        message = 'strains.image_url must be a URL/path, not a data URI',
        hint = 'Upload image to Supabase Storage and save its public URL instead.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists strains_prevent_data_uri_image_url on public.strains;
create trigger strains_prevent_data_uri_image_url
before insert or update on public.strains
for each row
execute function public.prevent_data_uri_strain_image_url();

alter table public.strains enable row level security;
alter table public.merch_items enable row level security;
alter table public.shop_profile enable row level security;
alter table public.admin_users enable row level security;
alter table public.strains force row level security;
alter table public.merch_items force row level security;
alter table public.shop_profile force row level security;
alter table public.admin_users force row level security;

drop policy if exists strains_public_read on public.strains;
create policy strains_public_read
on public.strains
for select
to anon, authenticated
using (is_published = true);

drop policy if exists strains_admin_manage on public.strains;
create policy strains_admin_manage
on public.strains
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists merch_public_read on public.merch_items;
create policy merch_public_read
on public.merch_items
for select
to anon, authenticated
using (is_published = true);

drop policy if exists merch_admin_manage on public.merch_items;
create policy merch_admin_manage
on public.merch_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists shop_public_read on public.shop_profile;
create policy shop_public_read
on public.shop_profile
for select
to anon, authenticated
using (true);

drop policy if exists shop_admin_manage on public.shop_profile;
create policy shop_admin_manage
on public.shop_profile
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_users_self_read on public.admin_users;
drop policy if exists admin_users_admin_read on public.admin_users;
create policy admin_users_admin_read
on public.admin_users
for select
to authenticated
using (public.is_admin());

drop policy if exists admin_users_admin_manage on public.admin_users;
create policy admin_users_admin_manage
on public.admin_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.strains, public.merch_items, public.shop_profile to anon, authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.strains, public.merch_items, public.shop_profile to authenticated;
grant usage, select on all sequences in schema public to authenticated;

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

-- Strains are intentionally not auto-seeded here.
-- Use the admin panel to create your live catalog.

insert into public.merch_items (
  slug, name, category, description, bullet_points, image_url, image_alt, cta_label, cta_url, is_published, sort_order
)
values
  (
    'island-tee-front',
    'Island Tee - Front',
    'T-Shirt',
    'Front chest print with Our Logo and clean typography.',
    array['100% cotton, soft handfeel', 'Sizes XS-XL, relaxed fit', 'Front logo: Our Logo'],
    'image/1.svg',
    'Let''s Phuket T-shirt front view',
    'In-store only',
    null,
    true,
    1
  ),
  (
    'island-tee-back',
    'Island Tee - Back',
    'T-Shirt',
    'Full-back QR for our location',
    array['Same fabric/fit as front', 'Back includes QR to our shop address', 'Care: cold wash, inside-out'],
    'image/2.svg',
    'Let''s Phuket T-shirt back view',
    'In-store only',
    null,
    true,
    2
  )
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  bullet_points = excluded.bullet_points,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  cta_label = excluded.cta_label,
  cta_url = excluded.cta_url,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.shop_profile (
  id,
  name,
  visit_lede,
  address,
  hours_text,
  whatsapp_url,
  map_embed_url,
  map_note,
  visit_note
)
values (
  1,
  'Lets Phuket',
  'Drop by our beach-level lounge between Patong and Kamala. Ask for the terp flight and we''ll line up glass so you can taste the island spectrum.',
  '187, 36 Phangnga Rd, Talat Yai, Amphoe Muang, Phuket 83000',
  'Daily 10:00 AM - 12:00 PM',
  'https://wa.me/66628590096',
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7904.215842592954!2d98.39339171929876!3d7.883776347126515!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x305033006d463199%3A0x49f34f4c561f0d75!2sHotel%20California!5e0!3m2!1sen!2sth!4v1765009064854!5m2!1sen!2sth',
  '2 min walk from the sand - look for the neon leaf above the door.',
  'Visit our physical location. No online sales or delivery are offered through this website.'
)
on conflict (id) do update set
  name = excluded.name,
  visit_lede = excluded.visit_lede,
  address = excluded.address,
  hours_text = excluded.hours_text,
  whatsapp_url = excluded.whatsapp_url,
  map_embed_url = excluded.map_embed_url,
  map_note = excluded.map_note,
  visit_note = excluded.visit_note,
  updated_at = now();
