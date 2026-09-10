-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2 — Camp Access Links: corrige FK sem ON DELETE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Achado real (limpeza de fixtures de teste): `created_by_user_id` não
-- tinha ON DELETE, por isso apagar um utilizador (ex. teardown de fixtures
-- de teste, ou uma conta real de staff mais tarde) falhava com
-- "violates foreign key constraint" sempre que esse utilizador tivesse
-- criado algum link. SET NULL preserva a linha do link (histórico
-- operacional do campo) — só deixa de saber quem o criou, exactamente o
-- mesmo racional de campos nullable "criado por" já usados noutras tabelas.
--
-- FORWARD:  este ficheiro.
-- ROLLBACK: supabase/rollbacks/048_camp_access_links_fk_fix_rollback.sql

ALTER TABLE camp_access_links DROP CONSTRAINT IF EXISTS camp_access_links_created_by_user_id_fkey;
ALTER TABLE camp_access_links
  ADD CONSTRAINT camp_access_links_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE camp_access_events DROP CONSTRAINT IF EXISTS camp_access_events_actor_user_id_fkey;
ALTER TABLE camp_access_events
  ADD CONSTRAINT camp_access_events_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
