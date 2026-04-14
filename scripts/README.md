# @borkd/scripts

One-off CLI scripts for Borkd. **Intentionally outside `npm-workspace.yaml`**
so its dependencies don't pollute `apps/mobile` or `apps/admin` lockfile.

## Setup

```bash
cd scripts
npm install
cp .env.example .env.local
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
```

**Never commit `.env.local`** (already in `.gitignore` via `.env*` pattern).

## Seed permanent dog-friendly pins

```bash
# Dry run (no DB writes, prints counts)
npm seed:dry

# Specific source
npm seed:cos      # City of Sydney GeoJSONs
npm seed:osm      # OpenStreetMap Overpass API
npm seed:manual   # Manual council JSONs

# All sources → dedup → upsert
npm seed

# Force fresh OSM fetch (ignore cached response)
npm seed -- --source=osm --refresh
```

Upsert is idempotent on `(source, source_id)` — safe to re-run.

## Export GeoJSON for team review

```bash
npm export:geojson
# writes data/seed/exports/seeded-pins-sydney.geojson
# drag into https://geojson.io to visualise
```

## Prerequisites

- Node 20+ (for global `fetch`)
- Raw GeoJSON files in `data/seed/raw/` (see `data/seed/raw/README.md`)
- Manual council JSONs in `data/seed/manual/` (see `data/seed/LICENSES.md`)
- Supabase staging project with migration `00007_permanent_pins.sql` applied

## Layout

```
scripts/
  package.json            # independent workspace
  tsconfig.json
  .env.example            # template (gitignored actual: .env.local)
  seed/
    index.ts              # CLI entry point
    config.ts             # env + paths
    supabase.ts           # service_role client (server-only)
    dedup.ts              # 50m + Levenshtein 0.7, authority-based
    upsert.ts             # 500-row chunks, onConflict=source,source_id
    export-geojson.ts     # DB → FeatureCollection
    sources/
      city-of-sydney.ts   # 3 GeoJSON files
      osm-overpass.ts     # Overpass QL + fallback endpoints
      manual-councils.ts  # Zod-validated JSONs + Nominatim fallback
    transform/
      canonical.ts        # CanonicalPin type, category mappers
      nominatim.ts        # 1 req/sec rate limiter + cache
```
