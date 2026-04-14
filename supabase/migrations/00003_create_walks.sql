CREATE TABLE IF NOT EXISTS public.walks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dog_ids UUID[] DEFAULT '{}',

  -- Walk data
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  distance_km NUMERIC(10, 3),
  avg_speed_kmh NUMERIC(5, 2),
  max_speed_kmh NUMERIC(5, 2),

  -- GPS data
  route GEOMETRY(LineString, 4326),           -- Full recorded route
  walking_route GEOMETRY(LineString, 4326),   -- Speed-filtered walking route
  raw_trace_encrypted BYTEA,                  -- Envelope encrypted raw GPS
  start_point GEOMETRY(Point, 4326),
  end_point GEOMETRY(Point, 4326),

  -- Metadata
  weather_condition TEXT,
  temperature_celsius NUMERIC(4, 1),
  elevation_gain_m NUMERIC(7, 1),
  selfie_url TEXT,

  -- Economy
  miles_earned INTEGER DEFAULT 0,
  pin_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_walks_route ON public.walks USING GIST(route);
CREATE INDEX IF NOT EXISTS idx_walks_walking_route ON public.walks USING GIST(walking_route);
CREATE INDEX IF NOT EXISTS idx_walks_start_point ON public.walks USING GIST(start_point);

-- User + time index for history queries
CREATE INDEX IF NOT EXISTS idx_walks_user_started ON public.walks(user_id, started_at DESC);

DROP TRIGGER IF EXISTS walks_updated_at ON public.walks;
CREATE TRIGGER walks_updated_at
  BEFORE UPDATE ON public.walks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
