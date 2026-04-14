-- Rollback for 00004_create_pins.sql
-- Run manually; data loss warning (drops all pins + seeded permanent pins).

BEGIN;

DROP TRIGGER IF EXISTS pins_updated_at ON public.pins;
DROP INDEX IF EXISTS idx_pins_user_id;
DROP INDEX IF EXISTS idx_pins_category_active;
DROP INDEX IF EXISTS idx_pins_location;
DROP TABLE IF EXISTS public.pins CASCADE;

COMMIT;
