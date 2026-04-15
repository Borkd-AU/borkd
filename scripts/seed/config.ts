import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// scripts/seed/ → scripts/ (one up)
loadEnv({ path: resolve(__dirname, '..', '.env.local') });

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v || v.trim() === '') {
    throw new Error(
      `Missing env var: ${key}. Copy scripts/.env.example to scripts/.env.local and fill values.`,
    );
  }
  return v;
}

export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

export const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ?? 'Borkd MVP seeder (ryan@borkd.app)';

/**
 * Matches packages/shared BBOX_SYDNEY. Duplicated (not imported) because
 * `scripts/` is deliberately outside pnpm-workspace.yaml and doesn't link
 * to the workspace. Keep values in sync.
 */
export const BBOX_SYDNEY = {
  south: -34.05,
  west: 150.85,
  north: -33.55,
  east: 151.35,
} as const;

/** Matches packages/shared SYSTEM_USER_ID. Keep in sync. */
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000b0b';

/** Directory layout resolved from scripts/seed/ */
export const PATHS = {
  scriptsDir: resolve(__dirname, '..'),
  repoRoot: resolve(__dirname, '..', '..'),
  dataRaw: resolve(__dirname, '..', '..', 'data', 'seed', 'raw'),
  dataManual: resolve(__dirname, '..', '..', 'data', 'seed', 'manual'),
  dataExports: resolve(__dirname, '..', '..', 'data', 'seed', 'exports'),
  geocodeCache: resolve(__dirname, '..', '..', 'data', 'seed', 'manual', '.geocoded.json'),
  droppedLog: resolve(__dirname, '..', '..', 'data', 'seed', 'dropped.json'),
} as const;
