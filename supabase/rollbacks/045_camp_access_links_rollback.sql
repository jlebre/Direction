-- ROLLBACK de 045_camp_access_links.sql
--
-- Remove as funções e tabelas novas. Não afecta nenhuma tabela financeira
-- existente nem qualquer dado histórico — camp_access_links/camp_access_events
-- são tabelas novas, aditivas, sem consumidores fora do código desta feature.

DROP FUNCTION IF EXISTS public.camp_access_delete_despesa(uuid, uuid);
DROP FUNCTION IF EXISTS public.camp_access_update_despesa(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.camp_access_create_despesa(uuid, jsonb);
DROP FUNCTION IF EXISTS public.camp_access_list_despesa_linhas(uuid, uuid);
DROP FUNCTION IF EXISTS public.camp_access_get_despesa(uuid, uuid);
DROP FUNCTION IF EXISTS public.camp_access_list_despesas(uuid);
DROP FUNCTION IF EXISTS public.camp_access_get_campo(uuid);
DROP FUNCTION IF EXISTS public.camp_access_camp_id(uuid);
DROP FUNCTION IF EXISTS public.camp_access_bootstrap(text);
DROP FUNCTION IF EXISTS public.camp_access_revoke_link(uuid);
DROP FUNCTION IF EXISTS public.camp_access_create_link(uuid, text, timestamptz);

DROP TABLE IF EXISTS camp_access_events;
DROP TABLE IF EXISTS camp_access_links;
