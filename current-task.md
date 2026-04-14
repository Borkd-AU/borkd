# Current Task

**Title**: Seed 250+ permanent dog-friendly pins for Sydney MVP
**Branch**: `feat/seed-permanent-pins`
**Locked by**: Ryan (MacBook Pro, Claude Code session 2026-04-14)
**Started**: 2026-04-14
**Target**: Before Friday 2026-04-24 ideation workshop

## Context

Team decided on 2026-04-13 that MVP launch requires pre-seeded permanent pins (Steph's UX insight: users need populated data at launch, can't rely on UGC alone). Data sources: **City of Sydney ArcGIS Hub (CC BY 4.0) + OpenStreetMap Overpass (ODbL) + manual council geocoding**. Google Places API excluded (ToS violation for persistent storage).

Goal this sprint: back-end data layer exists and is queryable. Mobile UI wiring is deferred to next sprint (after Steph's design).

## Definition of Done

- [ ] `SELECT COUNT(*) FROM pins WHERE pin_type='permanent'` ≥ 300 in staging Supabase
- [ ] CHECK constraint `pins_expiry_matches_type` holds: `SELECT COUNT(*) FROM pins WHERE pin_type='permanent' AND expires_at IS NOT NULL` returns 0
- [ ] Anon curl to `get_pins_in_viewport()` RPC returns permanent pins (RLS policy verified)
- [ ] All permanent pin coordinates inside Sydney bbox (`ST_Within` check passes for every row)
- [ ] `(source, source_id)` unique index: re-running seed script produces identical count (idempotent)
- [ ] `data/seed/exports/seeded-pins-sydney.geojson` generated and verified by dragging into [geojson.io](https://geojson.io)
- [ ] `data/seed/LICENSES.md` contains CC BY 4.0 + ODbL + council sources + download dates
- [ ] Biome lint passes on `scripts/` and modified `packages/shared/`
- [ ] Conventional commits on `feat/seed-permanent-pins` branch (split: `feat(db)`, `feat(seed)`, `chore(scripts)`, `feat(types)`)
- [ ] PR opened against `develop` (not main — CLAUDE.md git workflow)

## Success Metric (for team demo)

Steph/Joon/Roy can drag `seeded-pins-sydney.geojson` into geojson.io and see 300+ dots distributed across Sydney, color-coded by source (Council / OSM / Manual). Data layer is **existence-proven** for the 24 April ideation workshop.

## Out of Scope (explicit defer until Steph design)

- Mobile Map tab Supabase wiring (current placeholder stays)
- Permanent pin marker color/icon/cluster styling
- Pin detail bottom sheet
- Admin dashboard permanent filter
- `subcategory` enum formalization in `packages/shared`
- Upvote/downvote UI split (hide for permanent)
- Google Places live lookup integration (Phase 4, not now)
- Permanent pin photos (`photo_url=null` until Wikimedia CC pipeline — future)

## Risk Log

- **iCloud sync conflicts**: working in `~/Desktop/DEV_Local/` (local, not iCloud) — mitigated by fresh clone
- **Overpass API rate limits**: two endpoints fallback in `scripts/seed/sources/osm-overpass.ts`
- **Nominatim rate limits**: 1 req/sec, `User-Agent` set, results cached in `.geocoded.json`
- **ODbL compliance**: OSM rows kept separate (no field-level merge), attribution in LICENSES.md + per-row `attribution` column
- **Sydney bbox trap**: `ST_MakePoint(lng, lat)` lng-first; coordinate validation in TS before insert
