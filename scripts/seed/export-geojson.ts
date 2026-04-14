import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PATHS } from './config';
import { supabase } from './supabase';

/**
 * Exports all permanent pins to GeoJSON for team review.
 * Drag the resulting file into https://geojson.io to visualise.
 */
async function main(): Promise<void> {
  console.log('[export] fetching permanent pins...');
  const { data, error } = await supabase
    .from('pins')
    .select('id, name, category, subcategory, source, attribution, location')
    .eq('pin_type', 'permanent');

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn('[export] no permanent pins in database');
  }

  // PostGIS returns geography as an opaque string by default. Use an RPC
  // that returns lng/lat separately so we don't depend on format guesses.
  const { data: rows, error: rpcError } = await supabase.rpc('get_pins_in_viewport', {
    min_lng: 150.5,
    min_lat: -34.3,
    max_lng: 151.7,
    max_lat: -33.4,
  });

  if (rpcError) {
    throw new Error(`RPC get_pins_in_viewport failed: ${rpcError.message}`);
  }

  type RpcRow = {
    id: string;
    pin_type: string;
    category: string;
    subcategory: string | null;
    name: string | null;
    note: string | null;
    attribution: string | null;
    longitude: number;
    latitude: number;
  };

  const features = (rows as RpcRow[])
    .filter((r) => r.pin_type === 'permanent')
    .map((r) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [r.longitude, r.latitude],
      },
      properties: {
        id: r.id,
        name: r.name,
        category: r.category,
        subcategory: r.subcategory,
        attribution: r.attribution,
      },
    }));

  const geojson = {
    type: 'FeatureCollection' as const,
    features,
  };

  await mkdir(PATHS.dataExports, { recursive: true });
  const outPath = join(PATHS.dataExports, 'seeded-pins-sydney.geojson');
  await writeFile(outPath, JSON.stringify(geojson, null, 2), 'utf8');
  console.log(`[export] wrote ${features.length} features → ${outPath}`);
  console.log('[export] drag this file into https://geojson.io to visualise');
}

main().catch((err) => {
  console.error('[export] FAILED:', err);
  process.exit(1);
});
