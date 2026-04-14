import { SYSTEM_USER_ID } from './config';
import { supabase } from './supabase';
import type { CanonicalPin } from './transform/canonical';

const CHUNK_SIZE = 500;

type PinRow = {
  user_id: string;
  pin_type: 'permanent';
  category: CanonicalPin['category'];
  subcategory: string;
  source: CanonicalPin['source'];
  source_id: string;
  name: string;
  note: string;
  attribution: string;
  location: string; // WKT
  expires_at: null;
  is_expired: false;
};

function toRow(p: CanonicalPin): PinRow {
  // WKT is lng-first (POINT(lng lat)). A coordinate-order bug here plants
  // every pin in the ocean off the NSW coast.
  return {
    user_id: SYSTEM_USER_ID,
    pin_type: 'permanent',
    category: p.category,
    subcategory: p.subcategory,
    source: p.source,
    source_id: p.source_id,
    name: p.name,
    note: p.note,
    attribution: p.attribution,
    location: `SRID=4326;POINT(${p.lng} ${p.lat})`,
    expires_at: null,
    is_expired: false,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export type UpsertStats = {
  attempted: number;
  chunks: number;
  errored: number;
};

export async function upsertPermanentPins(pins: CanonicalPin[]): Promise<UpsertStats> {
  const rows = pins.map(toRow);
  const batches = chunk(rows, CHUNK_SIZE);
  let errored = 0;

  for (const [i, batch] of batches.entries()) {
    const { error } = await supabase.from('pins').upsert(batch, { onConflict: 'source,source_id' });
    if (error) {
      console.error(`[upsert] batch ${i + 1}/${batches.length} failed: ${error.message}`);
      errored += batch.length;
    } else {
      console.log(`[upsert] batch ${i + 1}/${batches.length}: ${batch.length} rows`);
    }
  }

  return { attempted: rows.length, chunks: batches.length, errored };
}
