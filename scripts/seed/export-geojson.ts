import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PATHS } from './config';
import { supabase } from './supabase';

/**
 * Exports all permanent pins to GeoJSON for team review.
 * Drag the resulting file into https://geojson.io to visualise —
 * geojson.io colour-codes markers by the `source` property.
 *
 * Uses `get_permanent_pins_for_export` (migration 00008), which
 * returns rows in a deterministic ORDER BY id. We paginate with an
 * id cursor so the export is correct even if new permanent pins are
 * inserted while this script is running.
 */

type ExportRow = {
  id: string;
  category: string;
  subcategory: string | null;
  name: string | null;
  source: string | null;
  source_id: string | null;
  attribution: string | null;
  longitude: number;
  latitude: number;
  created_at: string;
};

type GeoJsonFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id: string;
    name: string | null;
    category: string;
    subcategory: string | null;
    source: string | null;
    attribution: string | null;
  };
};

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

const PAGE_SIZE = 1000;
const HARD_LIMIT = 100_000;

async function fetchAllPermanentPins(): Promise<ExportRow[]> {
  const collected: ExportRow[] = [];
  let afterId: string | null = null;

  for (let pageNum = 1; ; pageNum += 1) {
    const { data, error } = await supabase.rpc('get_permanent_pins_for_export', {
      after_id: afterId,
      page_size: PAGE_SIZE,
    });

    if (error) {
      throw new Error(
        `RPC get_permanent_pins_for_export failed on page ${pageNum}: ${error.message}`,
      );
    }

    const page = (data ?? []) as ExportRow[];
    collected.push(...page);

    // Final page when the server returned fewer rows than the page size.
    if (page.length < PAGE_SIZE) break;

    // Guard against a buggy cursor (would loop forever on repeated rows).
    if (collected.length > HARD_LIMIT) {
      throw new Error(
        `Export exceeded hard limit (${HARD_LIMIT}) — possible duplicate-row bug in pagination.`,
      );
    }

    // Advance cursor using the last id of the batch. Safe because the
    // RPC contract orders by id ASC.
    const last = page[page.length - 1];
    if (!last) break;
    afterId = last.id;
  }

  return collected;
}

function toFeature(row: ExportRow): GeoJsonFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [row.longitude, row.latitude],
    },
    properties: {
      id: row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      source: row.source,
      attribution: row.attribution,
    },
  };
}

async function main(): Promise<void> {
  console.log('[export] fetching permanent pins via cursor pagination...');
  const rows = await fetchAllPermanentPins();

  if (rows.length === 0) {
    console.warn('[export] no permanent pins in database — writing empty FeatureCollection');
  }

  const collection: GeoJsonFeatureCollection = {
    type: 'FeatureCollection',
    features: rows.map(toFeature),
  };

  await mkdir(PATHS.dataExports, { recursive: true });
  const outPath = join(PATHS.dataExports, 'seeded-pins-sydney.geojson');
  await writeFile(outPath, JSON.stringify(collection, null, 2), 'utf8');

  // Per-source counts help catch silent drops (e.g., if one source
  // accidentally regresses to zero rows on a future schema change).
  const bySource = new Map<string, number>();
  for (const row of rows) {
    const key = row.source ?? 'unknown';
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const breakdown = [...bySource.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, n]) => `${source}=${n}`)
    .join(', ');

  console.log(`[export] wrote ${rows.length} features → ${outPath}`);
  console.log(`[export] breakdown: ${breakdown}`);
  console.log('[export] drag this file into https://geojson.io to visualise');
}

main().catch((err) => {
  console.error('[export] FAILED:', err);
  process.exit(1);
});
