# Seed data licenses & attribution

This folder contains pre-seeded location data for Borkd's Sydney MVP.
All sources are legally usable in a commercial app with attribution.

## Sources

### 1. City of Sydney Open Data (CC BY 4.0)

- **Publisher**: City of Sydney Council
- **Portal**: https://data.cityofsydney.nsw.gov.au
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Attribution (required)**: "© City of Sydney (CC BY 4.0)"
- **Datasets**:
  - `raw/cos-off-leash.geojson` — Dog off-leash parks (~30 records)
    https://data.cityofsydney.nsw.gov.au/datasets/cityofsydney::dog-off-leash-parks/explore
  - `raw/cos-parks.geojson` — Parks (~400 records)
    https://data.cityofsydney.nsw.gov.au/datasets/cityofsydney::parks-1
  - `raw/cos-fountains.geojson` — Drinking fountains / water bubblers (~100 records)
    https://data.cityofsydney.nsw.gov.au/datasets/cityofsydney::drinking-fountains-water-bubblers/explore

### 2. OpenStreetMap (ODbL)

- **Publisher**: OpenStreetMap contributors
- **Portal**: https://www.openstreetmap.org
- **License**: Open Database License (ODbL) 1.0 — https://opendatacommons.org/licenses/odbl/1-0/
- **Attribution (required)**: "© OpenStreetMap contributors" (linking to openstreetmap.org/copyright)
- **Source**: Overpass API query — `scripts/seed/sources/osm-overpass.ts`
- **Raw cache**: `raw/osm-response.json` (committed for reproducibility + Collective Database
  accountability under ODbL §4.4)
- **ODbL Collective Database discipline**: OSM rows are kept as separate records; we never
  merge OSM fields into rows from other sources. When dedup finds duplicates, the OSM row
  is discarded, not merged. This keeps the combined dataset a Collective Database (ODbL §4.5)
  rather than a Derivative Database (which would trigger share-alike on the whole thing).

### 3. Manual curation (per-council)

- **Sources**: Waverley, Randwick, Woollahra, Inner West councils + Centennial Parklands
- **License**: Attribution to the publishing council per record (stored in `attribution` column)
- **Files**: `manual/waverley.json`, `manual/randwick.json`, `manual/woollahra.json`,
  `manual/inner-west.json`, `manual/centennial.json`
- **Council references**:
  - Waverley: https://www.waverley.nsw.gov.au/residents/pets/offleash_parks
  - Randwick: https://randwick-council.maps.arcgis.com (ArcGIS WebAppViewer)
  - Woollahra: https://www.woollahra.nsw.gov.au/services/animals-and-pets/walking-your-dog
    (2025-10 LGA-wide review applied)
  - Inner West: https://www.innerwest.nsw.gov.au (PDF policy doc)
  - Centennial Parklands: https://www.centennialparklands.com.au (PDF dog map)
- **Workflow**: place names copied from council pages; coordinates entered manually from
  Google Maps right-click → copy coordinates (coordinate values alone are factual data,
  not subject to Google's Places API ToS).
- **Per-record attribution**: `"© <Council> Council"` or `"© Centennial Park and Moore Park Trust"`.

## What we do NOT use

**Google Places API / Google Maps scraping**: excluded for Sydney MVP.
Google's Places API terms (Section 3.2.3) prohibit long-term caching, redistribution, and
display on non-Google maps. The stored `place_id` is allowed but not the content. See Phase 4
plan for future live-lookup integration (allowed for real-time display only).

## Download dates

| Source | Downloaded on |
|--------|---------------|
| City of Sydney — Dog off-leash parks (51 points) | 2026-04-14 |
| City of Sydney — Parks (418 multipolygons) | 2026-04-14 |
| City of Sydney — Drinking fountains (273 points) | 2026-04-14 |
| OSM Overpass | <pending seed run, will cache in raw/osm-response.json> |
| Manual council pages | waverley.json: 2026-04-14 (8 entries) |

## Where attribution surfaces in the app

- **Permanent pin detail** (Figma design pending): per-pin `attribution` field shown in footer
- **Settings → Data Sources** (to be designed): consolidated list of CC BY 4.0 + ODbL + councils
- **Mapbox** (separate): its own attribution requirement handled by `attributionEnabled={true}`
  when the mobile Map tab is wired up (post-Figma)

This file fulfils the "reasonable public notice" requirement under CC BY 4.0 §3(a)(1)(A) and
ODbL §4.3 attribution obligations for seed-time imports. Runtime attribution (per-pin and
aggregated) is tracked separately via the `pins.attribution` column.
