-- Delete legacy seed strains that should no longer appear on public pages.
-- Safe to run on existing databases.

delete from public.strains
where slug in (
  'tropical-cherry',
  'subzero',
  'banana-daddy',
  'blueberry-muffin',
  'pink-runtz',
  'tea-time',
  'lgbtq',
  'zupa',
  'neon-icon',
  'super-boof'
);

-- Optional cleanup for previously uploaded assets under the same slug folders.
delete from storage.objects
where bucket_id = 'strain-images'
  and (
    name like 'strains/tropical-cherry/%' or
    name like 'strains/subzero/%' or
    name like 'strains/banana-daddy/%' or
    name like 'strains/blueberry-muffin/%' or
    name like 'strains/pink-runtz/%' or
    name like 'strains/tea-time/%' or
    name like 'strains/lgbtq/%' or
    name like 'strains/zupa/%' or
    name like 'strains/neon-icon/%' or
    name like 'strains/super-boof/%'
  );
