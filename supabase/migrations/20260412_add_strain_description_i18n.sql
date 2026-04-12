-- Add bilingual description support for strain detail pages.
-- Safe to run on existing databases.

alter table if exists public.strains
  add column if not exists description_en text,
  add column if not exists description_mm text;

update public.strains
set description_en = short_description
where coalesce(btrim(description_en), '') = '';

alter table public.strains
  alter column description_en set default '',
  alter column description_en set not null;
