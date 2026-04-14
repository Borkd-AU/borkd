-- Rollback for 00001_create_users.sql
--
-- Run MANUALLY via Supabase Studio SQL editor only if 00001's forward
-- migration causes a live incident. Data loss warning: drops the users
-- table and all rows.
--
-- Does NOT drop postgis / uuid-ossp extensions — those are shared and
-- may be depended on by other schemas.

BEGIN;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
DROP INDEX IF EXISTS idx_users_username;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

COMMIT;
