-- ============================================================
-- Migration 00008: Export RPC for permanent pins
-- ============================================================
-- Dedicated RPC for exporting permanent pins to GeoJSON / CSV.
--
-- Why a separate function (not reusing get_pins_in_viewport)?
--   1. Stable ordering: cursor pagination requires a deterministic
--      ORDER BY. Adding ORDER BY to the production viewport RPC is
--      an implicit contract change (mobile renders in RPC order).
--   2. Column shape: export consumers want `source`/`source_id`/
--      `created_at`/`location` as EWKT so the file is self-describing
--      for geojson.io + LICENSES attribution. Mobile doesn't need these.
--   3. Bounded by design: only permanent pins. No bbox, no expiry,
--      no category filter — exports are always the full catalogue.
--
-- Pagination contract with client:
--   * Sorted by id ASC (UUIDs are not monotonic but ORDER BY id is
--     stable, so cursor = "id > last_seen_id" gives exactly-once
--     delivery even if new rows are inserted mid-export).
--   * Client passes `after_id` (NULL for first page) and `page_size`.
--   * Last page is detected when rowcount < page_size.
--
-- Access: SECURITY INVOKER (default) — the caller's role decides.
-- Anon CAN read permanent pins (RLS policy from 00007), so this RPC
-- works with anon, service_role, and authenticated.


CREATE OR REPLACE FUNCTION public.get_permanent_pins_for_export(
  after_id  UUID DEFAULT NULL,
  page_size INT  DEFAULT 1000
)
RETURNS TABLE (
  id          UUID,
  category    TEXT,
  subcategory TEXT,
  name        TEXT,
  source      TEXT,
  source_id   TEXT,
  attribution TEXT,
  longitude   FLOAT8,
  latitude    FLOAT8,
  created_at  TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    p.id,
    p.category,
    p.subcategory,
    p.name,
    p.source,
    p.source_id,
    p.attribution,
    ST_X(p.location)::FLOAT8 AS longitude,
    ST_Y(p.location)::FLOAT8 AS latitude,
    p.created_at
  FROM public.pins p
  WHERE p.pin_type = 'permanent'
    AND (after_id IS NULL OR p.id > after_id)
  ORDER BY p.id
  -- Clamp page_size to [1, 5000] so a buggy or hostile caller can't
  -- degrade the database by asking for a billion rows in one round-trip.
  LIMIT LEAST(GREATEST(page_size, 1), 5000);
$$;

-- Make the export RPC usable with the anon key so the same function
-- drives both the admin dashboard (service_role) and future public
-- data dumps (anon). RLS on pins still governs row visibility.
GRANT EXECUTE ON FUNCTION public.get_permanent_pins_for_export(UUID, INT)
  TO anon, authenticated;
