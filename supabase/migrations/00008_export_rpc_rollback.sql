-- Rollback for 00008_export_rpc.sql
-- Minimal: 00008 only added a single read-only RPC. Dropping it is safe;
-- no data is affected.

BEGIN;

DROP FUNCTION IF EXISTS public.get_permanent_pins_for_export(UUID, INT);

COMMIT;
