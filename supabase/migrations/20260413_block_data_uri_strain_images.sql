-- Prevent new/changed strains.image_url values from storing base64 data URIs.
-- Existing legacy rows remain editable as long as image_url is unchanged.

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
