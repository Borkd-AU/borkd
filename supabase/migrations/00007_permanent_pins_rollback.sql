-- Rollback for 00007_permanent_pins.sql
--
-- Reverses the schema extensions for permanent pins. Run manually only
-- if 00007 causes a live incident. Data loss warning: any rows with
-- pin_type='permanent' will be removed along with the new columns.
--
-- Leaves get_pins_in_viewport + get_pin_clusters in their updated
-- (00007) form because restoring the 00006 form requires a full DROP
-- FUNCTION + CREATE cycle; safer to patch forward in 00008+ if the
-- mobile client still expects the old shape.

BEGIN;

-- Restore original pins SELECT policy so anonymous reads stop.
DROP POLICY IF EXISTS "Anyone can view permanent pins"             ON public.pins;
DROP POLICY IF EXISTS "Authenticated can view active temporary pins" ON public.pins;
DROP POLICY IF EXISTS "Users create own temporary pins"            ON public.pins;
DROP POLICY IF EXISTS "Users update own temporary pins"            ON public.pins;
DROP POLICY IF EXISTS "Users delete own temporary pins"            ON public.pins;

CREATE POLICY "Authenticated users can view active pins" ON public.pins
  FOR SELECT USING (auth.role() = 'authenticated' AND is_expired = FALSE);
CREATE POLICY "Users can create pins" ON public.pins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pins" ON public.pins
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pins" ON public.pins
  FOR DELETE USING (auth.uid() = user_id);

-- Remove system user (safe: CASCADE removes owned rows)
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000b0b';

-- Drop the schema extensions
DROP INDEX IF EXISTS idx_pins_permanent;
ALTER TABLE public.pins DROP CONSTRAINT IF EXISTS pins_source_unique;
ALTER TABLE public.pins DROP CONSTRAINT IF EXISTS pins_expiry_matches_type;
ALTER TABLE public.pins
  DROP COLUMN IF EXISTS attribution,
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS subcategory,
  DROP COLUMN IF EXISTS pin_type;

-- Restore NOT NULL on expires_at — may fail if any row has NULL; in
-- that case backfill `NOW() + INTERVAL '14 days'` first.
ALTER TABLE public.pins ALTER COLUMN expires_at SET NOT NULL;

COMMIT;
