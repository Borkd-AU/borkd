-- ============================================================
-- Migration 00007: Permanent pins (pre-seeded dog-friendly locations)
-- ============================================================
-- Extends the `pins` table so permanent pre-seeded locations and
-- temporary user-reported hazards share the same backend, matching
-- the 2026-04-13 team meeting decision.
--
-- New shape of `pins`:
--   pin_type ∈ {'temporary', 'permanent'}
--   - temporary: user-created, expires_at required, 14-day default TTL
--   - permanent: system-seeded, expires_at NULL, source/source_id required
--
-- RLS: anon can read permanent (public map), authenticated users create
-- only temporary pins (cannot spoof system-seeded data).


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 1: Schema changes — extend pins table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.pins
  ADD COLUMN pin_type    TEXT NOT NULL DEFAULT 'temporary'
                         CHECK (pin_type IN ('temporary', 'permanent')),
  ADD COLUMN subcategory TEXT,
  ADD COLUMN source      TEXT,
  ADD COLUMN source_id   TEXT,
  ADD COLUMN name        TEXT,
  ADD COLUMN attribution TEXT;

-- Permanent pins never expire — relax NOT NULL, enforce via CHECK
ALTER TABLE public.pins ALTER COLUMN expires_at DROP NOT NULL;

ALTER TABLE public.pins
  ADD CONSTRAINT pins_expiry_matches_type CHECK (
    (pin_type = 'temporary' AND expires_at IS NOT NULL)
    OR (pin_type = 'permanent' AND expires_at IS NULL)
  );

-- Idempotent re-seeding: (source, source_id) uniquely identifies a
-- pre-seeded record across reruns. Postgres UNIQUE treats NULLs as
-- distinct (default NULLS DISTINCT), so user-created temporary pins
-- with NULL source/source_id can coexist without collision. We use a
-- CONSTRAINT (not partial INDEX) so supabase-js can target it via
-- onConflict='source,source_id' — partial indexes aren't eligible for
-- ON CONFLICT.
ALTER TABLE public.pins
  ADD CONSTRAINT pins_source_unique UNIQUE (source, source_id);

-- Fast filter for permanent pins by subcategory (map viewport queries)
CREATE INDEX idx_pins_permanent
  ON public.pins(pin_type, subcategory)
  WHERE pin_type = 'permanent';

-- pg_trgm enables future similarity-based dedup queries if needed
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 2: Update get_pins_in_viewport() to surface new columns
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Permanent pins bypass the is_expired filter.
-- Returned columns now include pin_type, subcategory, name, attribution
-- so the mobile app can render venue-shape markers and attribution
-- footers when Figma design lands.
--
-- DROP first because RETURNS TABLE shape changed vs. 00006; CREATE OR
-- REPLACE refuses to alter column types.

DROP FUNCTION IF EXISTS public.get_pins_in_viewport(FLOAT8, FLOAT8, FLOAT8, FLOAT8, TEXT);

CREATE OR REPLACE FUNCTION public.get_pins_in_viewport(
  min_lng          FLOAT8,
  min_lat          FLOAT8,
  max_lng          FLOAT8,
  max_lat          FLOAT8,
  category_filter  TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                 UUID,
  user_id            UUID,
  category           TEXT,
  subcategory        TEXT,
  pin_type           TEXT,
  name               TEXT,
  note               TEXT,
  photo_url          TEXT,
  attribution        TEXT,
  upvotes            INTEGER,
  downvotes          INTEGER,
  verification_score NUMERIC,
  longitude          FLOAT8,
  latitude           FLOAT8,
  created_at         TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    p.id,
    p.user_id,
    p.category,
    p.subcategory,
    p.pin_type,
    p.name,
    p.note,
    p.photo_url,
    p.attribution,
    p.upvotes,
    p.downvotes,
    p.verification_score,
    ST_X(p.location)::FLOAT8 AS longitude,
    ST_Y(p.location)::FLOAT8 AS latitude,
    p.created_at
  FROM public.pins p
  WHERE
    (p.pin_type = 'permanent' OR p.is_expired = FALSE)
    AND ST_Within(
      p.location,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    AND (category_filter IS NULL OR p.category = category_filter);
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 3: Update get_pin_clusters() to include permanent pins
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.get_pin_clusters(
  min_lng    FLOAT8,
  min_lat    FLOAT8,
  max_lng    FLOAT8,
  max_lat    FLOAT8,
  zoom_level INT DEFAULT 10
)
RETURNS TABLE (
  cluster_lng       FLOAT8,
  cluster_lat       FLOAT8,
  pin_count         BIGINT,
  dominant_category TEXT
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH params AS (
    SELECT 360.0 / POWER(2, zoom_level) AS grid_size
  ),
  snapped AS (
    SELECT
      ST_SnapToGrid(p.location, (SELECT grid_size FROM params)) AS cell,
      p.category
    FROM public.pins p
    WHERE
      (p.pin_type = 'permanent' OR p.is_expired = FALSE)
      AND ST_Within(
        p.location,
        ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
      )
  ),
  clusters AS (
    SELECT
      cell,
      COUNT(*)                                AS pin_count,
      MODE() WITHIN GROUP (ORDER BY category) AS dominant_category
    FROM snapped
    GROUP BY cell
  )
  SELECT
    ST_X(cell)::FLOAT8 AS cluster_lng,
    ST_Y(cell)::FLOAT8 AS cluster_lat,
    pin_count,
    dominant_category
  FROM clusters;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 4: RLS — anon reads permanent, authenticated create temporary
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Replace the old "Authenticated users can view active pins" policy
-- with two narrower policies: one for permanent (open to anon), one
-- for temporary (authenticated only).
DROP POLICY IF EXISTS "Authenticated users can view active pins" ON public.pins;

CREATE POLICY "Anyone can view permanent pins" ON public.pins
  FOR SELECT TO anon, authenticated
  USING (pin_type = 'permanent');

CREATE POLICY "Authenticated can view active temporary pins" ON public.pins
  FOR SELECT TO authenticated
  USING (pin_type = 'temporary' AND is_expired = FALSE);

-- Users can only INSERT/UPDATE/DELETE temporary pins they own.
-- Permanent pins are system-managed (service_role only).
DROP POLICY IF EXISTS "Users can create pins" ON public.pins;
CREATE POLICY "Users create own temporary pins" ON public.pins
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND pin_type = 'temporary');

DROP POLICY IF EXISTS "Users can update own pins" ON public.pins;
CREATE POLICY "Users update own temporary pins" ON public.pins
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND pin_type = 'temporary');

DROP POLICY IF EXISTS "Users can delete own pins" ON public.pins;
CREATE POLICY "Users delete own temporary pins" ON public.pins
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND pin_type = 'temporary');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 5: System user for permanent pins
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- permanent pins still need a user_id (pins.user_id NOT NULL). Use a
-- fixed zero-prefix UUID so it's recognisable in queries and logs.
-- The auth trigger (00006 SECTION 1) populates public.users.display_name
-- from raw_user_meta_data->>'display_name'. We follow up with an
-- UPDATE to set username (trigger doesn't handle it).

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000b0b',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'system@borkd.app',
  '',
  NOW(),
  '{"provider":"system","providers":["system"]}',
  '{"display_name":"Borkd"}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Trigger inserts the public.users row with display_name='Borkd' but
-- leaves username NULL. Fill it so the UNIQUE index idx_users_username
-- doesn't later collide with a real user claiming 'borkd'.
UPDATE public.users
SET username = 'borkd'
WHERE id = '00000000-0000-0000-0000-000000000b0b'
  AND username IS NULL;
