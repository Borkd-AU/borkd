-- ============================================================
-- Migration 00006: Backend Functions, Triggers & Storage
-- ============================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 1: Auth Trigger — Auto-create public.users on signup
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url   TEXT;
BEGIN
  -- Prefer display_name from OAuth/metadata; fall back to email prefix
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- avatar_url is populated for OAuth providers (Google, Apple, etc.)
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.users (id, display_name, avatar_url)
  VALUES (NEW.id, v_display_name, v_avatar_url);

  RETURN NEW;
END;
$$;

-- Drop first so re-running the migration is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 2: get_pins_in_viewport()
-- Returns all active (non-expired) pins within a lat/lng bbox,
-- with an optional category filter.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  note               TEXT,
  photo_url          TEXT,
  upvotes            INTEGER,
  downvotes          INTEGER,
  verification_score NUMERIC,
  longitude          FLOAT8,
  latitude           FLOAT8,
  created_at         TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.user_id,
    p.category,
    p.note,
    p.photo_url,
    p.upvotes,
    p.downvotes,
    p.verification_score,
    ST_X(p.location)::FLOAT8 AS longitude,
    ST_Y(p.location)::FLOAT8 AS latitude,
    p.created_at
  FROM public.pins p
  WHERE
    p.is_expired = FALSE
    AND ST_Within(
      p.location,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    AND (category_filter IS NULL OR p.category = category_filter);
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 3: get_pin_clusters()
-- Grid-based spatial clustering — grid cell shrinks as zoom
-- increases so clusters break apart when the user zooms in.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.get_pin_clusters(
  min_lng    FLOAT8,
  min_lat    FLOAT8,
  max_lng    FLOAT8,
  max_lat    FLOAT8,
  zoom_level INT DEFAULT 10
)
RETURNS TABLE (
  cluster_lng        FLOAT8,
  cluster_lat        FLOAT8,
  pin_count          BIGINT,
  dominant_category  TEXT
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH
  -- Derive grid size from zoom level: coarser at low zoom, finer at high zoom
  params AS (
    SELECT 360.0 / POWER(2, zoom_level) AS grid_size
  ),

  -- Snap each pin to its grid cell centre
  snapped AS (
    SELECT
      ST_SnapToGrid(p.location, (SELECT grid_size FROM params)) AS cell,
      p.category
    FROM public.pins p
    WHERE
      p.is_expired = FALSE
      AND ST_Within(
        p.location,
        ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
      )
  ),

  -- Aggregate per grid cell
  clusters AS (
    SELECT
      cell,
      COUNT(*)                                       AS pin_count,
      -- Most common category wins; ties broken alphabetically
      MODE() WITHIN GROUP (ORDER BY category)        AS dominant_category
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
-- SECTION 4: calculate_walk_miles()
-- Pure calculation — 1 mile per 0.5 km, capped at 100.
-- IMMUTABLE so Postgres can inline / cache the result.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.calculate_walk_miles(
  distance_km NUMERIC
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT LEAST(
    100,
    GREATEST(0, FLOOR(distance_km / 0.5))
  )::INTEGER;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 5: complete_walk()
-- Finalises a walk in a single server-side transaction:
--   • marks the walk as completed
--   • awards miles to the user
--   • maintains daily streak logic
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.complete_walk(
  walk_id                UUID,
  final_distance_km      NUMERIC,
  final_duration_seconds INTEGER
)
RETURNS INTEGER  -- miles earned
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id         UUID;
  v_miles_earned    INTEGER;
  v_last_walk_date  DATE;
  v_today           DATE := CURRENT_DATE;
  v_new_streak      INTEGER;
  v_current_streak  INTEGER;
  v_longest_streak  INTEGER;
BEGIN
  -- ── 1. Resolve the walk owner ──────────────────────────────
  SELECT user_id
  INTO   v_user_id
  FROM   public.walks
  WHERE  id = walk_id
    AND  status = 'active'
  FOR UPDATE;  -- lock the row for the duration of this txn

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Walk % not found or already completed', walk_id;
  END IF;

  -- ── 2. Calculate miles ────────────────────────────────────
  v_miles_earned := public.calculate_walk_miles(final_distance_km);

  -- ── 3. Finalise the walk record ───────────────────────────
  UPDATE public.walks
  SET
    status            = 'completed',
    ended_at          = NOW(),
    distance_km       = final_distance_km,
    duration_seconds  = final_duration_seconds,
    miles_earned      = v_miles_earned,
    updated_at        = NOW()
  WHERE id = walk_id;

  -- ── 4. Fetch current streak state ─────────────────────────
  SELECT
    current_streak,
    longest_streak,
    -- Date of the most recently completed walk (excluding the one we just closed)
    (
      SELECT DATE(ended_at)
      FROM   public.walks
      WHERE  user_id   = v_user_id
        AND  status    = 'completed'
        AND  id        <> walk_id
      ORDER  BY ended_at DESC
      LIMIT  1
    )
  INTO v_current_streak, v_longest_streak, v_last_walk_date
  FROM public.users
  WHERE id = v_user_id;

  -- ── 5. Determine new streak value ─────────────────────────
  IF v_last_walk_date = v_today - INTERVAL '1 day' THEN
    -- Walked yesterday — extend streak
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Streak broken (or first walk ever) — reset to 1
    v_new_streak := 1;
  END IF;

  -- ── 6. Update user stats ──────────────────────────────────
  UPDATE public.users
  SET
    total_walks         = total_walks + 1,
    total_distance_km   = total_distance_km + final_distance_km,
    total_miles_earned  = total_miles_earned + v_miles_earned,
    current_streak      = v_new_streak,
    longest_streak      = GREATEST(longest_streak, v_new_streak),
    updated_at          = NOW()
  WHERE id = v_user_id;

  RETURN v_miles_earned;
END;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 6: Storage Buckets + RLS Policies
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── Buckets ───────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    5242880,   -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'pin-photos',
    'pin-photos',
    true,
    10485760,  -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'walk-selfies',
    'walk-selfies',
    false,     -- private bucket
    10485760,  -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;


-- ── avatars bucket policies ───────────────────────────────────

-- Public read
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated upload to own folder ({user_id}/*)
CREATE POLICY "avatars: owner upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );

-- Owner can replace / update their own file
CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );

-- Owner can delete their own file
CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );


-- ── pin-photos bucket policies ────────────────────────────────

-- Public read
CREATE POLICY "pin-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pin-photos');

-- Authenticated upload to own folder
CREATE POLICY "pin-photos: owner upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pin-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );

-- Owner update
CREATE POLICY "pin-photos: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pin-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );

-- Owner delete
CREATE POLICY "pin-photos: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pin-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );


-- ── walk-selfies bucket policies ──────────────────────────────
-- Private bucket — only the owner can upload or read their files.

-- Owner read only (no public SELECT)
CREATE POLICY "walk-selfies: owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'walk-selfies'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );

-- Owner upload
CREATE POLICY "walk-selfies: owner upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'walk-selfies'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );

-- Owner update
CREATE POLICY "walk-selfies: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'walk-selfies'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );

-- Owner delete
CREATE POLICY "walk-selfies: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'walk-selfies'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
  );
