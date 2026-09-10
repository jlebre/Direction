-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2 — Camp Access Links: leituras adicionais para o dashboard completo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O dashboard de Adjuntos (`/campo/[id]/adjuntos`) mostra despesas,
-- devoluções e regularizações NIF juntas para calcular o saldo. A migration
-- 045 só cobriu despesas (escrita "só despesas primeiro", mesmo padrão
-- incremental da subfase 2.6) — mas leitura é mais barata e de menor risco
-- do que escrita, por isso o dashboard fica completo já: só faltam 2 RPCs
-- de leitura (devoluções, regularizações), sem tocar escrita nenhuma.
--
-- FORWARD:  este ficheiro.
-- ROLLBACK: supabase/rollbacks/046_camp_access_reads_rollback.sql

CREATE OR REPLACE FUNCTION public.camp_access_list_devolucoes(p_link_id uuid)
RETURNS SETOF devolucoes
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT dv.* FROM devolucoes dv WHERE dv.campo_id = public.camp_access_camp_id(p_link_id);
$$;

CREATE OR REPLACE FUNCTION public.camp_access_get_devolucao(p_link_id uuid, p_devolucao_id uuid)
RETURNS SETOF devolucoes
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT dv.* FROM devolucoes dv
  WHERE dv.id = p_devolucao_id AND dv.campo_id = public.camp_access_camp_id(p_link_id);
$$;

CREATE OR REPLACE FUNCTION public.camp_access_list_regularizacoes(p_link_id uuid)
RETURNS SETOF regularizacoes_nif
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.* FROM regularizacoes_nif r WHERE r.campo_id = public.camp_access_camp_id(p_link_id);
$$;

GRANT EXECUTE ON FUNCTION public.camp_access_list_devolucoes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_get_devolucao(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_list_regularizacoes(uuid) TO anon, authenticated;
