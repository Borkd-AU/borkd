-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- ━━━ users ━━━
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ━━━ dogs ━━━
CREATE POLICY "Users can manage own dogs" ON public.dogs
  FOR ALL USING (auth.uid() = user_id);

-- ━━━ walks ━━━
CREATE POLICY "Users can view own walks" ON public.walks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own walks" ON public.walks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own walks" ON public.walks
  FOR UPDATE USING (auth.uid() = user_id);

-- ━━━ pins ━━━
CREATE POLICY "Authenticated users can view active pins" ON public.pins
  FOR SELECT USING (auth.role() = 'authenticated' AND is_expired = FALSE);
CREATE POLICY "Users can create pins" ON public.pins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pins" ON public.pins
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pins" ON public.pins
  FOR DELETE USING (auth.uid() = user_id);
