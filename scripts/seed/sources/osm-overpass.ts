import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BBOX_SYDNEY, PATHS } from '../config';
import {
  type CanonicalPin,
  assertSydneyBbox,
  defaultNote,
  osmToCanonical,
} from '../transform/canonical';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const;

const CACHE_FILE = 'osm-response.json';
const ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  version: number;
  generator: string;
  elements: OsmElement[];
};

function buildQuery(): string {
  const { south, west, north, east } = BBOX_SYDNEY;
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:90];
(
  // ── Dog spots ─────────────────────────────────────────────
  nwr["leisure"="dog_park"](${bbox});
  nwr["dog"="yes"](${bbox});
  nwr["dog"="unleashed"](${bbox});
  nwr["dog"="off_leash"](${bbox});
  nwr["dog"="designated"](${bbox});
  nwr["amenity"="cafe"]["dog"~"yes|leashed"](${bbox});
  nwr["amenity"="restaurant"]["dog"~"yes|leashed"](${bbox});
  nwr["amenity"="pub"]["dog"~"yes|leashed"](${bbox});
  nwr["natural"="beach"](${bbox});
  nwr["amenity"="drinking_water"]["dog"="yes"](${bbox});

  // ── Pet services (no dog=* required — these are dog-relevant by definition) ───────
  nwr["amenity"="veterinary"](${bbox});
  nwr["shop"="pet"](${bbox});
  nwr["shop"="pet_grooming"](${bbox});

  // ── Public dog-waste + dog-toilet infrastructure ──────────
  nwr["amenity"="dog_toilet"](${bbox});
  nwr["amenity"="waste_basket"]["waste"="dog_excrement"](${bbox});

  // ── Boarding + shelter + healthcare vet (beyond amenity=veterinary) ──
  nwr["amenity"="animal_boarding"](${bbox});
  nwr["amenity"="animal_shelter"](${bbox});
  nwr["healthcare"="veterinary"](${bbox});

  // ── Dog-friendly bars + dog wash stations ──────────────────
  nwr["amenity"="bar"]["dog"~"yes|leashed"](${bbox});
  nwr["amenity"="dog_wash"](${bbox});
  nwr["self_service"="dog_wash"](${bbox});
);
out center tags;`;
}

async function fetchWithFallback(query: string): Promise<OverpassResponse> {
  let lastErr: unknown;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as OverpassResponse;
    } catch (e) {
      lastErr = e;
      console.warn(`[osm] ${url} failed: ${(e as Error).message}`);
    }
  }
  throw new Error(`All Overpass endpoints failed: ${(lastErr as Error)?.message}`);
}

async function readCache(): Promise<OverpassResponse | null> {
  try {
    const raw = await readFile(join(PATHS.dataRaw, CACHE_FILE), 'utf8');
    return JSON.parse(raw) as OverpassResponse;
  } catch {
    return null;
  }
}

async function writeCache(data: OverpassResponse): Promise<void> {
  await mkdir(PATHS.dataRaw, { recursive: true });
  await writeFile(join(PATHS.dataRaw, CACHE_FILE), JSON.stringify(data, null, 2), 'utf8');
}

function coords(el: OsmElement): { lat: number; lng: number } | null {
  if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

/**
 * Fetches OSM elements. Uses cached response if present (ODbL reproducibility).
 * Pass { refresh: true } to force a new fetch.
 */
export async function fetchOsmOverpass(opts: { refresh?: boolean } = {}): Promise<CanonicalPin[]> {
  let data: OverpassResponse | null = null;
  if (!opts.refresh) data = await readCache();
  if (!data) {
    console.log('[osm] fetching Overpass API (this may take up to 60s)...');
    data = await fetchWithFallback(buildQuery());
    await writeCache(data);
    console.log(`[osm] cached ${data.elements.length} elements to ${CACHE_FILE}`);
  } else {
    console.log(`[osm] using cached response (${data.elements.length} elements)`);
  }

  const out: CanonicalPin[] = [];
  let skipped = 0;

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const mapping = osmToCanonical(tags);
    if (!mapping) {
      skipped += 1;
      continue;
    }
    const c = coords(el);
    if (!c) {
      skipped += 1;
      continue;
    }
    try {
      assertSydneyBbox(c, `osm/${el.type}/${el.id}`);
    } catch (e) {
      console.warn(`[osm] ${(e as Error).message} — skipping`);
      skipped += 1;
      continue;
    }

    const name = tags.name?.trim() || `OSM ${mapping.subcategory} ${el.id}`;

    out.push({
      source: 'osm',
      source_id: `osm_${el.type}/${el.id}`,
      category: mapping.category,
      subcategory: mapping.subcategory,
      name,
      lat: c.lat,
      lng: c.lng,
      note: defaultNote(name, mapping.subcategory),
      attribution: ATTRIBUTION,
    });
  }

  console.log(`[osm] kept ${out.length}, skipped ${skipped}`);
  return out;
}
