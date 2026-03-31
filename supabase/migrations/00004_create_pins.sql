CREATE TABLE public.pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  walk_id UUID REFERENCES public.walks(id) ON DELETE SET NULL,

  -- Pin data
  category TEXT NOT NULL CHECK (category IN ('good_spot', 'hazard', 'amenity', 'wildlife')),
  note TEXT NOT NULL,
  photo_url TEXT,
  location GEOMETRY(Point, 4326) NOT NULL,

  -- Metadata
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  verification_score NUMERIC(3, 2) DEFAULT 1.0,

  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  is_expired BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for map queries
CREATE INDEX idx_pins_location ON public.pins USING GIST(location);

-- Category + expiry for filtered queries
CREATE INDEX idx_pins_category_active ON public.pins(category) WHERE is_expired = FALSE;

-- User pins
CREATE INDEX idx_pins_user_id ON public.pins(user_id);

CREATE TRIGGER pins_updated_at
  BEFORE UPDATE ON public.pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
