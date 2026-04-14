import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { NOMINATIM_USER_AGENT, PATHS } from '../config';

type CacheEntry = { lat: number; lng: number; ts: string };
type Cache = Record<string, CacheEntry>;

let cache: Cache | null = null;

async function loadCache(): Promise<Cache> {
  if (cache) return cache;
  try {
    const raw = await readFile(PATHS.geocodeCache, 'utf8');
    cache = JSON.parse(raw) as Cache;
  } catch {
    cache = {};
  }
  return cache;
}

async function saveCache(): Promise<void> {
  if (!cache) return;
  await mkdir(dirname(PATHS.geocodeCache), { recursive: true });
  await writeFile(PATHS.geocodeCache, JSON.stringify(cache, null, 2), 'utf8');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let lastRequestAt = 0;
const NOMINATIM_MIN_INTERVAL_MS = 1100; // 1 req/sec policy, 100ms buffer

/**
 * Geocode an address using Nominatim. Rate-limited to 1 req/sec and cached.
 * Returns null if not found or outside Australia.
 */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const c = await loadCache();
  const key = address.trim().toLowerCase();
  if (c[key]) {
    return { lat: c[key].lat, lng: c[key].lng };
  }

  // Rate limit
  const wait = Math.max(0, NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', address);
  url.searchParams.set('countrycodes', 'au');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': NOMINATIM_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}: ${address}`);
  }

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (results.length === 0) return null;
  const first = results[0];
  if (!first) return null;

  const lat = Number.parseFloat(first.lat);
  const lng = Number.parseFloat(first.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  c[key] = { lat, lng, ts: new Date().toISOString() };
  await saveCache();
  return { lat, lng };
}
