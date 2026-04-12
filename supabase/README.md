# Supabase Setup

## 1) Run SQL
1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run [`schema.sql`](./schema.sql) once.

This creates:
- `strains`
- `merch_items`
- `shop_profile`
- `admin_users`
- RLS policies and seed data

## 2) Configure frontend
Edit [`../supabase-config.js`](../supabase-config.js):

```js
window.__SUPABASE_CONFIG__ = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

If `url`/`anonKey` are blank, the website automatically falls back to local hardcoded content.
This project is static HTML/JS, so values in `.env` are not auto-loaded by the browser runtime.

## 3) Grant admin edit access
After creating a user in Supabase Auth, run this SQL with that user id:

```sql
insert into public.admin_users (user_id)
values ('YOUR_AUTH_USER_UUID')
on conflict (user_id) do nothing;
```

Users listed in `admin_users` can write to `strains`, `merch_items`, and `shop_profile` through Supabase client queries.

## 4) Recommended content workflow
- Use Supabase Table Editor for content updates.
- Keep `is_published=true` for public items.
- Set exactly one `strains.is_featured=true` for hero content.
- Control display order via `sort_order`.

## 5) Incremental migrations (existing projects)
If your project was created before bilingual strain descriptions, paste and run the SQL from:
- [`migrations/20260412_add_strain_description_i18n.sql`](./migrations/20260412_add_strain_description_i18n.sql)

If your project was created before admin image uploads to Supabase Storage, also run:
- [`migrations/20260412_add_strain_image_storage_bucket.sql`](./migrations/20260412_add_strain_image_storage_bucket.sql)

To remove the original demo strains from older databases, run:
- [`migrations/20260413_delete_old_seed_strains.sql`](./migrations/20260413_delete_old_seed_strains.sql)

To block new `data:image/...` URLs from being stored in `strains.image_url`, run:
- [`migrations/20260413_block_data_uri_strain_images.sql`](./migrations/20260413_block_data_uri_strain_images.sql)

## 6) Convert legacy base64 `image_url` rows to Storage URLs
If your `strains.image_url` contains large `data:image/...;base64,...` values, convert them to files in Supabase Storage first:

```bash
# Dry-run (read-only)
node supabase/scripts/migrate-strain-data-uri-images.mjs --dry-run

# Apply migration with service role key (recommended)
SUPABASE_SERVICE_ROLE_KEY=... \
node supabase/scripts/migrate-strain-data-uri-images.mjs --apply

# Or apply with admin user credentials (must be in public.admin_users)
SUPABASE_EMAIL=admin@example.com \
SUPABASE_PASSWORD=... \
node supabase/scripts/migrate-strain-data-uri-images.mjs --apply
```

Notes:
- Script reads `SUPABASE_URL` from env or `../supabase-config.js`.
- Upload target bucket is `strain-images`.
- The script is idempotent (`x-upsert=true`) and can be rerun safely.
