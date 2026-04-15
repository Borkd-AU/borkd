-- Rollback for 00002_create_dogs.sql
-- Run manually; data loss warning (drops all dog rows).

BEGIN;

DROP TRIGGER IF EXISTS dogs_updated_at ON public.dogs;
DROP INDEX IF EXISTS idx_dogs_user_id;
DROP TABLE IF EXISTS public.dogs CASCADE;

COMMIT;
