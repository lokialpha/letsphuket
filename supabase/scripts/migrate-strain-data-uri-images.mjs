#!/usr/bin/env node

import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DEFAULT_BUCKET = 'strain-images';
const DEFAULT_PATH_PREFIX = 'strains';
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_CACHE_CONTROL = '31536000';
const MAX_BUCKET_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml'
]);

const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function printUsage() {
  console.log(`
Usage:
  node supabase/scripts/migrate-strain-data-uri-images.mjs [--dry-run] [--apply] [--limit=N] [--concurrency=N]

Modes:
  --dry-run      Analyze and prepare conversion without writing (default).
  --apply        Upload decoded images to Supabase Storage and update strains.image_url.

Auth priority:
  1) SUPABASE_SERVICE_ROLE_KEY
  2) SUPABASE_EMAIL + SUPABASE_PASSWORD (+ anon key)
  3) anon key (read-only, dry-run only)

Env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_ANON_KEY
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  SUPABASE_EMAIL / SUPABASE_PASSWORD
  SUPABASE_MIGRATION_EMAIL / SUPABASE_MIGRATION_PASSWORD
`);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: false,
    help: false,
    limit: Infinity,
    concurrency: DEFAULT_CONCURRENCY
  };

  for (const raw of argv) {
    const arg = String(raw || '').trim();
    if (!arg) continue;

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    if (arg === '--apply') {
      args.apply = true;
      continue;
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (!Number.isFinite(n) || n < 1) throw new Error(`Invalid --limit value: ${arg}`);
      args.limit = Math.floor(n);
      continue;
    }
    if (arg.startsWith('--concurrency=')) {
      const n = Number(arg.slice('--concurrency='.length));
      if (!Number.isFinite(n) || n < 1 || n > 16) {
        throw new Error(`Invalid --concurrency value: ${arg} (allowed 1-16)`);
      }
      args.concurrency = Math.floor(n);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.apply && args.dryRun) {
    throw new Error('Use either --apply or --dry-run, not both.');
  }

  if (!args.apply) args.dryRun = true;
  return args;
}

function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadFrontendSupabaseConfig(filePath) {
  if (!existsSync(filePath)) return {};

  const source = readFileSync(filePath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 1000, filename: filePath });
  return context.window.__SUPABASE_CONFIG__ || {};
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

function normalizeMimeType(value) {
  const mime = String(value || '').trim().toLowerCase();
  if (!mime) return '';
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/svg') return 'image/svg+xml';
  return mime;
}

function bytesLabel(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b < 0) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function toSafeSlug(value, fallback = 'strain') {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || fallback;
}

function encodeObjectPath(pathValue) {
  return String(pathValue || '')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function parseDataUriImage(dataUri) {
  const value = String(dataUri || '').trim();
  if (!value.toLowerCase().startsWith('data:')) {
    throw new Error('Not a data URI.');
  }

  const commaIndex = value.indexOf(',');
  if (commaIndex < 0) {
    throw new Error('Malformed data URI (missing comma separator).');
  }

  const meta = value.slice(5, commaIndex);
  const payload = value.slice(commaIndex + 1);
  const metaParts = meta.split(';').map((part) => part.trim()).filter(Boolean);

  const mimeCandidate = metaParts[0] && !metaParts[0].includes('=') ? metaParts[0] : '';
  const mimeType = normalizeMimeType(mimeCandidate);
  const isBase64 = metaParts.some((part) => part.toLowerCase() === 'base64');

  let bytes;
  if (isBase64) {
    const normalizedPayload = payload.replace(/\s+/g, '');
    bytes = Buffer.from(normalizedPayload, 'base64');
  } else {
    bytes = Buffer.from(decodeURIComponent(payload), 'utf8');
  }

  if (!bytes.length) {
    throw new Error('Decoded image payload is empty.');
  }

  if (!mimeType.startsWith('image/')) {
    throw new Error(`Unsupported data URI mime type: "${mimeType || 'unknown'}"`);
  }

  return { mimeType, bytes };
}

function buildStoragePath({ slug, id, bytes, mimeType, pathPrefix }) {
  const safeSlug = toSafeSlug(slug, `strain-${id}`);
  const hash = crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 12);
  const extension = MIME_TO_EXTENSION[mimeType] || 'bin';
  return `${pathPrefix}/${safeSlug}/${id}-${hash}.${extension}`;
}

async function readResponsePayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function createAuthHeaders(apiKey, bearerToken, extraHeaders = {}) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${bearerToken}`,
    ...extraHeaders
  };
}

async function signInWithPassword({ baseUrl, anonKey, email, password }) {
  const endpoint = `${baseUrl}/auth/v1/token?grant_type=password`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await readResponsePayload(response);
  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`Password auth failed (${response.status}): ${details}`);
  }

  const token = payload?.access_token;
  if (!token) throw new Error('Password auth succeeded but access_token was missing.');
  return token;
}

function isDataImageUrl(value) {
  return /^data:image\//i.test(String(value || '').trim());
}

async function fetchDataUriRows({ baseUrl, apiKey, bearerToken, pageSize, maxRows }) {
  const rows = [];
  let from = 0;

  while (true) {
    const remaining = Number.isFinite(maxRows) ? Math.max(0, maxRows - rows.length) : pageSize;
    if (remaining === 0) break;

    const chunkSize = Math.min(pageSize, remaining);
    const to = from + chunkSize - 1;

    const params = new URLSearchParams({
      select: 'id,slug,image_url,image_alt',
      order: 'id.asc'
    });

    const endpoint = `${baseUrl}/rest/v1/strains?${params.toString()}`;
    const response = await fetch(endpoint, {
      headers: createAuthHeaders(apiKey, bearerToken, {
        Prefer: 'count=exact',
        Range: `${from}-${to}`,
        'Range-Unit': 'items'
      })
    });

    const payload = await readResponsePayload(response);
    if (!response.ok) {
      const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
      throw new Error(`Failed to fetch strains (${response.status}): ${details}`);
    }

    const list = Array.isArray(payload) ? payload : [];
    if (!list.length) break;
    for (const row of list) {
      if (isDataImageUrl(row?.image_url)) {
        rows.push(row);
        if (Number.isFinite(maxRows) && rows.length >= maxRows) {
          return rows;
        }
      }
    }

    if (list.length < chunkSize) break;
    from += chunkSize;
  }

  return rows;
}

async function uploadToStorage({ baseUrl, apiKey, bearerToken, bucket, objectPath, mimeType, bytes }) {
  const encodedPath = encodeObjectPath(objectPath);
  const endpoint = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: createAuthHeaders(apiKey, bearerToken, {
      'Content-Type': mimeType,
      'cache-control': DEFAULT_CACHE_CONTROL,
      'x-upsert': 'true'
    }),
    body: bytes
  });

  const payload = await readResponsePayload(response);
  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`Storage upload failed (${response.status}): ${details}`);
  }
}

async function updateStrainRowImageUrl({ baseUrl, apiKey, bearerToken, id, imageUrl }) {
  const endpoint = `${baseUrl}/rest/v1/strains?id=eq.${encodeURIComponent(String(id))}`;
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: createAuthHeaders(apiKey, bearerToken, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify({ image_url: imageUrl })
  });

  const payload = await readResponsePayload(response);
  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`Row update failed (${response.status}): ${details}`);
  }
}

async function runWithPool(items, workerFn, concurrency) {
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));

  const workers = Array.from({ length: workerCount }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await workerFn(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  loadDotEnvFile(path.join(repoRoot, '.env'));
  const frontendConfig = loadFrontendSupabaseConfig(path.join(repoRoot, 'supabase-config.js'));

  const supabaseUrl = normalizeBaseUrl(
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    frontendConfig.url
  );
  const anonKey = String(
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    frontendConfig.anonKey ||
    ''
  ).trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();
  const email = String(process.env.SUPABASE_MIGRATION_EMAIL || process.env.SUPABASE_EMAIL || '').trim();
  const password = String(process.env.SUPABASE_MIGRATION_PASSWORD || process.env.SUPABASE_PASSWORD || '').trim();

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is missing. Set it in env or supabase-config.js');
  }

  let apiKey = '';
  let bearerToken = '';
  let authMode = '';
  let canWrite = false;

  if (serviceRoleKey) {
    apiKey = serviceRoleKey;
    bearerToken = serviceRoleKey;
    authMode = 'service_role';
    canWrite = true;
  } else if (email && password) {
    if (!anonKey) {
      throw new Error('Anon key is required for password auth. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.');
    }
    bearerToken = await signInWithPassword({
      baseUrl: supabaseUrl,
      anonKey,
      email,
      password
    });
    apiKey = anonKey;
    authMode = `admin_password:${email}`;
    canWrite = true;
  } else if (anonKey) {
    apiKey = anonKey;
    bearerToken = anonKey;
    authMode = 'anon_read_only';
    canWrite = false;
  } else {
    throw new Error('No auth key found. Provide SUPABASE_SERVICE_ROLE_KEY or anon key env values.');
  }

  if (args.apply && !canWrite) {
    throw new Error('Write mode requires SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_EMAIL + SUPABASE_PASSWORD.');
  }

  const bucket = DEFAULT_BUCKET;
  const pathPrefix = DEFAULT_PATH_PREFIX;

  console.log(`Mode: ${args.apply ? 'apply' : 'dry-run'}`);
  console.log(`Auth: ${authMode}`);
  console.log(`Project: ${supabaseUrl}`);
  console.log(`Bucket: ${bucket}`);
  console.log('');

  const rows = await fetchDataUriRows({
    baseUrl: supabaseUrl,
    apiKey,
    bearerToken,
    pageSize: DEFAULT_PAGE_SIZE,
    maxRows: args.limit
  });

  if (!rows.length) {
    console.log('No strains with data URI image_url values were found.');
    return;
  }

  console.log(`Found ${rows.length} strain rows with data URI images.`);

  const stats = {
    prepared: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    totalBytesDecoded: 0
  };

  const startedAt = Date.now();

  await runWithPool(rows, async (row, idx) => {
    const label = `[${idx + 1}/${rows.length}] ${row.slug || `id-${row.id}`}`;

    try {
      const parsed = parseDataUriImage(row.image_url);
      const mimeType = normalizeMimeType(parsed.mimeType);
      const bytes = parsed.bytes;

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        stats.skipped += 1;
        console.log(`${label} skipped: unsupported mime "${mimeType}"`);
        return;
      }

      if (bytes.length > MAX_BUCKET_FILE_SIZE_BYTES) {
        stats.skipped += 1;
        console.log(`${label} skipped: ${bytesLabel(bytes.length)} exceeds 5 MB bucket limit`);
        return;
      }

      const objectPath = buildStoragePath({
        slug: row.slug,
        id: row.id,
        bytes,
        mimeType,
        pathPrefix
      });
      const encodedPath = encodeObjectPath(objectPath);
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;

      stats.prepared += 1;
      stats.totalBytesDecoded += bytes.length;

      if (!args.apply) {
        console.log(`${label} prepared: ${mimeType}, ${bytesLabel(bytes.length)} -> ${objectPath}`);
        return;
      }

      await uploadToStorage({
        baseUrl: supabaseUrl,
        apiKey,
        bearerToken,
        bucket,
        objectPath,
        mimeType,
        bytes
      });

      await updateStrainRowImageUrl({
        baseUrl: supabaseUrl,
        apiKey,
        bearerToken,
        id: row.id,
        imageUrl: publicUrl
      });

      stats.migrated += 1;
      console.log(`${label} migrated: ${publicUrl}`);
    } catch (error) {
      stats.errors += 1;
      console.error(`${label} error: ${error.message || String(error)}`);
    }
  }, args.concurrency);

  const elapsedMs = Date.now() - startedAt;
  console.log('\nSummary');
  console.log(`Prepared: ${stats.prepared}`);
  console.log(`Migrated: ${stats.migrated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Decoded bytes: ${bytesLabel(stats.totalBytesDecoded)}`);
  console.log(`Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`);

  if (!args.apply) {
    console.log('\nDry-run only. Re-run with --apply after setting write credentials.');
  }

  if (args.apply && stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Fatal: ${error.message || String(error)}`);
  process.exitCode = 1;
});
