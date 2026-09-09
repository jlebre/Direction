-- ROLLBACK de 041_legacy_anon_access_flag.sql — NÃO aplicado automaticamente.
-- Seguro de correr desde que nenhuma policy (migration 042+) ainda dependa
-- de has_legacy_anon_access().

DROP FUNCTION IF EXISTS public.has_legacy_anon_access(uuid);
DROP INDEX IF EXISTS campos_legacy_anon_access_idx;
ALTER TABLE campos DROP COLUMN IF EXISTS legacy_anon_access;
