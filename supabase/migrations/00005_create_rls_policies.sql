-- Enable RLS on all tables (ENABLE ROW LEVEL SECURITY is idempotent)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins  ENABLE ROW LEVEL SECURITY;

-- Policies: DROP first so re-running the migration replaces instead of
-- erroring with 'policy already exists' (CREATE POLICY has no IF NOT EXISTS).

-- ━━━ users ━━━
DROP POLICY IF EXISTS "Users can view own profile"   ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ━━━ dogs ━━━
DROP POLICY IF EXISTS "Users can manage own dogs" ON public.dogs;

CREATE POLICY "Users can manage own dogs" ON public.dogs
  FOR ALL USING (auth.uid() = user_id);

-- ━━━ walks ━━━
DROP POLICY IF EXISTS "Users can view own walks"   ON public.walks;
DROP POLICY IF EXISTS "Users can insert own walks" ON public.walks;
DROP POLICY IF EXISTS "Users can update own walks" ON public.walks;

CREATE POLICY "Users can view own walks" ON public.walks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own walks" ON public.walks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own walks" ON public.walks
  FOR UPDATE USING (auth.uid() = user_id);

-- ━━━ pins ━━━
DROP POLICY IF EXISTS "Authenticated users can view active pins" ON public.pins;
DROP POLICY IF EXISTS "Users can create pins"                    ON public.pins;
DROP POLICY IF EXISTS "Users can update own pins"                ON public.pins;
DROP POLICY IF EXISTS "Users can delete own pins"                ON public.pins;

CREATE POLICY "Authenticated users can view active pins" ON public.pins
  FOR SELECT USING (auth.role() = 'authenticated' AND is_expired = FALSE);
CREATE POLICY "Users can create pins" ON public.pins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pins" ON public.pins
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pins" ON public.pins
  FOR DELETE USING (auth.uid() = user_id);
