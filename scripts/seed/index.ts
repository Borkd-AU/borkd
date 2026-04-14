import { mkdir, writeFile } from 'node:fs/promises';
import { PATHS } from './config';
import { dedupePins } from './dedup';
import { fetchCityOfSydney } from './sources/city-of-sydney';
import { fetchManualCouncils } from './sources/manual-councils';
import { fetchOsmOverpass } from './sources/osm-overpass';
import type { CanonicalPin } from './transform/canonical';
import { upsertPermanentPins } from './upsert';

type SourceFilter = 'cos' | 'osm' | 'manual' | 'all';

function parseArgs(argv: string[]): { source: SourceFilter; dryRun: boolean; refresh: boolean } {
  let source: SourceFilter = 'all';
  let dryRun = false;
  let refresh = false;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--refresh') refresh = true;
    else if (arg.startsWith('--source=')) {
      const v = arg.slice('--source='.length);
      if (v === 'cos' || v === 'osm' || v === 'manual' || v === 'all') {
        source = v;
      } else {
        throw new Error(`Unknown --source value: ${v}`);
      }
    }
  }
  return { source, dryRun, refresh };
}

async function main(): Promise<void> {
  const { source, dryRun, refresh } = parseArgs(process.argv.slice(2));
  console.log(
    `[seed] starting (source=${source}, dry-run=${dryRun}, refresh=${refresh})`,
  );

  const all: CanonicalPin[] = [];

  if (source === 'all' || source === 'cos') {
    console.log('[seed] → City of Sydney');
    all.push(...(await fetchCityOfSydney()));
  }
  if (source === 'all' || source === 'osm') {
    console.log('[seed] → OSM Overpass');
    all.push(...(await fetchOsmOverpass({ refresh })));
  }
  if (source === 'all' || source === 'manual') {
    console.log('[seed] → Manual councils');
    all.push(...(await fetchManualCouncils()));
  }

  console.log(`[seed] total candidates: ${all.length}`);

  const { kept, dropped } = dedupePins(all);
  console.log(`[seed] dedup: kept ${kept.length}, dropped ${dropped.length}`);

  // Write dropped log for audit
  await mkdir(PATHS.dataExports, { recursive: true });
  await writeFile(PATHS.droppedLog, JSON.stringify(dropped, null, 2), 'utf8');
  console.log(`[seed] wrote ${PATHS.droppedLog}`);

  // Summary by source/subcategory
  const bySrc = new Map<string, number>();
  for (const p of kept) {
    const key = `${p.source}/${p.subcategory}`;
    bySrc.set(key, (bySrc.get(key) ?? 0) + 1);
  }
  console.log('[seed] breakdown (source/subcategory):');
  for (const [k, v] of [...bySrc.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  if (dryRun) {
    console.log('[seed] --dry-run: skipping upsert');
    return;
  }

  if (kept.length === 0) {
    console.warn('[seed] nothing to upsert');
    return;
  }

  const stats = await upsertPermanentPins(kept);
  console.log(
    `[seed] upsert done: attempted=${stats.attempted}, chunks=${stats.chunks}, errored=${stats.errored}`,
  );
}

main().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
