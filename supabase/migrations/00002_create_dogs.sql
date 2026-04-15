CREATE TABLE IF NOT EXISTS public.dogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  age_years NUMERIC(4, 1),
  weight_kg NUMERIC(5, 1),
  photo_url TEXT,
  personality_tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dogs_user_id ON public.dogs(user_id);

DROP TRIGGER IF EXISTS dogs_updated_at ON public.dogs;
CREATE TRIGGER dogs_updated_at
  BEFORE UPDATE ON public.dogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
