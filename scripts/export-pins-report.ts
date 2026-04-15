/**
 * Exports the current staging-Supabase pin inventory to two CSV files
 * under `data/exports/`:
 *
 *   1. `pins-summary-<timestamp>.csv`  — source × category × subcategory counts
 *   2. `pins-full-<timestamp>.csv`     — one row per pin with all display fields
 *
 * The `location` column is PostGIS GEOMETRY which PostgREST cannot
 * serialise directly, so we pull coords via the cursor-paginated
 * `get_permanent_pins_for_export` RPC (migration 00008) and then join
 * the non-spatial text / numeric columns (note, upvotes, downvotes,
 * verification_score, pin_type) in a second service-role query keyed
 * by id. The service_role key bypasses RLS and the PostgREST 1000-row
 * cap via explicit `.range()` pagination.
 *
 * Run:  pnpm tsx scripts/export-pins-report.ts
 *
 * Output CSVs open cleanly in Numbers / Excel / Google Sheets — UTF-8
 * with a BOM so Excel on Windows doesn't mangle Korean / emoji in
 * attribution or note fields.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { supabase } from './seed/supabase';

// ── types ──────────────────────────────────────────────────────────

type RpcRow = {
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

type MetaRow = {
  id: string;
  pin_type: string;
  note: string;
  upvotes: number;
  downvotes: number;
  verification_score: number | string;
};

type PinRow = RpcRow & Omit<MetaRow, 'id'>;

// ── pagination via the export RPC + metadata join ──────────────────

const PAGE_SIZE = 1000;

async function fetchAllPermanentPins(): Promise<PinRow[]> {
  // Step 1: spatial columns via the paginated RPC.
  const spatial: RpcRow[] = [];
  let afterId: string | null = null;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.rpc('get_permanent_pins_for_export', {
      after_id: afterId,
      page_size: PAGE_SIZE,
    });
    if (error) throw new Error(`get_permanent_pins_for_export failed: ${error.message}`);
    const page = (data ?? []) as RpcRow[];
    if (page.length === 0) break;
    spatial.push(...page);
    if (page.length < PAGE_SIZE) break;
    afterId = page.at(-1)?.id ?? null;
    if (!afterId) break;
  }

  // Step 2: non-spatial metadata. service_role bypasses RLS, and
  // `.range()` is needed because supabase-js' default cap is 1000 rows.
  const metaById = new Map<string, MetaRow>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('pins')
      .select('id, pin_type, note, upvotes, downvotes, verification_score')
      .eq('pin_type', 'permanent')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`pins metadata fetch failed: ${error.message}`);
    const page = (data ?? []) as MetaRow[];
    for (const row of page) metaById.set(row.id, row);
    if (page.length < PAGE_SIZE) break;
    if (from > 100_000) break; // defensive
  }

  // Step 3: join by id. Pins that only exist in one side are dropped
  // with a warning — there should never be any in practice.
  const joined: PinRow[] = [];
  for (const s of spatial) {
    const meta = metaById.get(s.id);
    if (!meta) {
      console.warn(`  ! pin ${s.id} (${s.source}/${s.source_id}) missing metadata row — skipping`);
      continue;
    }
    joined.push({
      ...s,
      pin_type: meta.pin_type,
      note: meta.note,
      upvotes: meta.upvotes,
      downvotes: meta.downvotes,
      verification_score: meta.verification_score,
    });
  }
  return joined;
}

// ── CSV helpers ────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // RFC 4180: quote if the field contains comma, quote, newline, or CR.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const head = headers.join(',');
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')).join('\n');
  // UTF-8 BOM so Excel auto-detects encoding and renders non-ASCII
  // (e.g. Korean attribution strings) correctly.
  return `\ufeff${head}\n${body}\n`;
}

// ── summary rollup ─────────────────────────────────────────────────

function summarize(pins: PinRow[]): Array<Record<string, unknown>> {
  const bucket = new Map<string, { count: number; lastSeen: string }>();
  for (const pin of pins) {
    const key = [pin.source ?? '(null)', pin.category, pin.subcategory ?? '(none)'].join('|');
    const prior = bucket.get(key);
    const created = pin.created_at;
    bucket.set(key, {
      count: (prior?.count ?? 0) + 1,
      lastSeen:
        !prior || (created && created > prior.lastSeen) ? (created ?? prior?.lastSeen ?? '') : prior.lastSeen,
    });
  }

  return Array.from(bucket.entries())
    .map(([key, v]) => {
      const [source, category, subcategory] = key.split('|');
      return {
        source,
        category,
        subcategory,
        count: v.count,
        last_seeded_at: v.lastSeen,
      };
    })
    .sort((a, b) => {
      // Primary: source asc; secondary: count desc.
      if (a.source !== b.source) return String(a.source).localeCompare(String(b.source));
      return (b.count as number) - (a.count as number);
    });
}

// ── main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const outDir = resolve(process.cwd(), 'data/exports');
  mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  console.log('Fetching permanent pins from staging Supabase…');
  const pins = await fetchAllPermanentPins();
  console.log(`  → ${pins.length.toLocaleString()} rows`);

  // Summary CSV
  const summary = summarize(pins);
  const summaryPath = resolve(outDir, `pins-summary-${stamp}.csv`);
  writeFileSync(
    summaryPath,
    toCsv(['source', 'category', 'subcategory', 'count', 'last_seeded_at'], summary),
  );
  console.log(`Summary written:  ${summaryPath}`);
  console.log('\nTop buckets:');
  for (const row of summary.slice(0, 15)) {
    console.log(
      `  ${String(row.source).padEnd(16)} ${String(row.category).padEnd(10)} ` +
        `${String(row.subcategory).padEnd(20)} ${String(row.count).padStart(6)}`,
    );
  }

  // Full dump CSV
  const fullRows = pins.map((p) => ({
    id: p.id,
    source: p.source ?? '',
    source_id: p.source_id ?? '',
    pin_type: p.pin_type,
    category: p.category,
    subcategory: p.subcategory ?? '',
    name: p.name ?? '',
    note: p.note,
    attribution: p.attribution ?? '',
    longitude: p.longitude,
    latitude: p.latitude,
    upvotes: p.upvotes,
    downvotes: p.downvotes,
    verification_score: p.verification_score,
    created_at: p.created_at,
  }));
  const fullPath = resolve(outDir, `pins-full-${stamp}.csv`);
  writeFileSync(
    fullPath,
    toCsv(
      [
        'id',
        'source',
        'source_id',
        'pin_type',
        'category',
        'subcategory',
        'name',
        'note',
        'attribution',
        'longitude',
        'latitude',
        'upvotes',
        'downvotes',
        'verification_score',
        'created_at',
      ],
      fullRows,
    ),
  );
  console.log(`Full dump written: ${fullPath}`);
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exitCode = 1;
});
