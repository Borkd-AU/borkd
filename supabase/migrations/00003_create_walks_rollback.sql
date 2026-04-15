-- Rollback for 00003_create_walks.sql
-- Run manually; data loss warning (drops all walk rows + encrypted GPS traces).

BEGIN;

DROP TRIGGER IF EXISTS walks_updated_at ON public.walks;
DROP INDEX IF EXISTS idx_walks_user_started;
DROP INDEX IF EXISTS idx_walks_start_point;
DROP INDEX IF EXISTS idx_walks_walking_route;
DROP INDEX IF EXISTS idx_walks_route;
DROP TABLE IF EXISTS public.walks CASCADE;

COMMIT;
