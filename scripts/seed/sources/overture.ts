import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BBOX_SYDNEY, PATHS } from '../config';
import {
  type CanonicalPin,
  assertSydneyBbox,
  defaultNote,
  overtureToCanonical,
  slugify,
} from '../transform/canonical';

const CACHE_FILE = 'overture-pet-sydney.json';
const ATTRIBUTION = '© Overture Maps Foundation (CDLA Permissive 2.0)';

// Minimum confidence score to keep a place. Overture assigns 0.0–1.0
// based on source agreement; below 0.3 is mostly duplicates or
// misclassified entries.
const MIN_CONFIDENCE = 0.3;

type OverturePlace = {
  id: string;
  name: string | null;
  category: string;
  confidence: number | null;
  latitude: number;
  longitude: number;
};

/**
 * Read the pre-fetched Overture Maps JSON extract (produced by
 * `scripts/overture-probe.mjs`) and convert to CanonicalPin[].
 *
 * Unlike OSM / CoS, we don't fetch live — the Overture Parquet query
 * takes 30–60s and 1GB+ of network, so it runs as a one-off probe
 * script and caches the result. Re-run `node scripts/overture-probe.mjs`
 * to refresh the cache when a new Overture release drops.
 */
export async function fetchOverture(): Promise<CanonicalPin[]> {
  const raw = await readFile(join(PATHS.dataRaw, CACHE_FILE), 'utf8');
  const places: OverturePlace[] = JSON.parse(raw);

  const pins: CanonicalPin[] = [];
  let skipped = 0;

  for (const place of places) {
    // Confidence filter
    if ((place.confidence ?? 0) < MIN_CONFIDENCE) {
      skipped++;
      continue;
    }

    // Category mapping
    const mapped = overtureToCanonical(place.category);
    if (!mapped) {
      skipped++;
      continue;
    }

    // Bbox sanity (should already be filtered by DuckDB query, but belt-and-suspenders)
    const lat = place.latitude;
    const lng = place.longitude;
    if (
      lat < BBOX_SYDNEY.south || lat > BBOX_SYDNEY.north ||
      lng < BBOX_SYDNEY.west || lng > BBOX_SYDNEY.east
    ) {
      skipped++;
      continue;
    }

    const name = place.name?.trim() || mapped.subcategory;

    pins.push({
      source: 'overture',
      source_id: `overture_${place.id}`,
      category: mapped.category,
      subcategory: mapped.subcategory,
      name,
      lat,
      lng,
      note: defaultNote(name, mapped.subcategory),
      attribution: ATTRIBUTION,
    });
  }

  console.log(`[overture] kept ${pins.length}, skipped ${skipped} (low confidence / unmapped / out-of-bbox)`);
  return pins;
}
