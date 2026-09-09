-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2.6 (V2 Security & Auth) — Danger Zone de SetupForm.tsx: RPC segura
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Achado de segurança (Fase 2, revisão do utilizador): a Danger Zone de
-- `/campo/[id]/setup` apagava despesas/devoluções/regularizações NIF/
-- liquidações NIF diretamente do cliente (`@/lib/supabase/client`, anon),
-- sem passar pela fronteira de servidor (Fase 2.6), sem transação (4 DELETEs
-- sequenciais, sem verificação de erro em 2 deles), e sem exigir PIN quando
-- o campo não tinha PIN configurado. Esta migration resolve a parte de BD:
-- uma função RPC que faz tudo numa única transação, com um gate de
-- autorização explícito ANTES de apagar nada (falha alto, em vez de
-- silenciosamente apagar 0 linhas por RLS e parecer "sucesso").
--
-- O gate de autorização replica EXATAMENTE a condição das policies RLS
-- (can_edit_camp OR is_admin OR is_treasurer OR has_legacy_anon_access) —
-- não introduz nem alarga nem restringe o que já é verdade hoje (decisão
-- "todos os 11 campos, por agora" da subfase 2.4). SECURITY INVOKER (não
-- DEFINER): os DELETEs continuam sujeitos à RLS do utilizador que chama,
-- o gate explícito é só para falhar com uma mensagem clara em vez de "0
-- linhas apagadas" ambíguo.
--
-- Storage (fotos) não é transacional com a BD — a função devolve os
-- `foto_path` a apagar; o Server Action que a chama é que remove do bucket
-- depois da transação da BD confirmar (mesma ordem que o código anterior,
-- só que agora a parte da BD é atómica).
--
-- FORWARD:      este ficheiro.
-- ROLLBACK:     supabase/rollbacks/043_danger_zone_rpc_rollback.sql
-- VERIFICATION: tests/e2e/danger-zone.spec.ts (só contra campo [TEST]).

CREATE OR REPLACE FUNCTION public.danger_zone_clear_financials(target_camp_id uuid)
RETURNS TABLE (
  count_despesas int,
  count_devolucoes int,
  count_regularizacoes int,
  count_liquidacoes int,
  foto_paths text[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count_despesas int;
  v_count_devolucoes int;
  v_count_regularizacoes int;
  v_count_liquidacoes int;
  v_foto_paths text[];
BEGIN
  IF NOT (
    public.can_edit_camp(target_camp_id)
    OR public.is_admin()
    OR public.is_treasurer()
    OR public.has_legacy_anon_access(target_camp_id)
  ) THEN
    RAISE EXCEPTION 'danger_zone_clear_financials: sem autorização para o campo %', target_camp_id
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.campos WHERE id = target_camp_id) THEN
    RAISE EXCEPTION 'danger_zone_clear_financials: campo % não existe', target_camp_id
      USING ERRCODE = 'P0002'; -- no_data_found
  END IF;

  SELECT coalesce(array_agg(foto_path), '{}') INTO v_foto_paths
  FROM (
    SELECT foto_path FROM public.despesas WHERE campo_id = target_camp_id AND foto_path IS NOT NULL
    UNION ALL
    SELECT foto_path FROM public.devolucoes WHERE campo_id = target_camp_id AND foto_path IS NOT NULL
  ) paths;

  SELECT count(*) INTO v_count_regularizacoes FROM public.regularizacoes_nif WHERE campo_id = target_camp_id;
  DELETE FROM public.regularizacoes_nif WHERE campo_id = target_camp_id;

  SELECT count(*) INTO v_count_liquidacoes FROM public.liquidacoes_nif WHERE campo_id = target_camp_id;
  DELETE FROM public.liquidacoes_nif WHERE campo_id = target_camp_id;

  SELECT count(*) INTO v_count_devolucoes FROM public.devolucoes WHERE campo_id = target_camp_id;
  DELETE FROM public.devolucoes WHERE campo_id = target_camp_id;

  SELECT count(*) INTO v_count_despesas FROM public.despesas WHERE campo_id = target_camp_id;
  DELETE FROM public.despesas WHERE campo_id = target_camp_id; -- CASCADE apaga despesa_linhas

  RETURN QUERY SELECT v_count_despesas, v_count_devolucoes, v_count_regularizacoes, v_count_liquidacoes, v_foto_paths;
END;
$$;

COMMENT ON FUNCTION public.danger_zone_clear_financials IS
  'Fase 2.6 V2. Apaga TODOS os dados financeiros (despesas, devoluções, '
  'regularizações/liquidações NIF) de um campo, numa única transação. '
  'Chamada só pelo Server Action src/actions/dangerZone.ts, nunca '
  'diretamente do cliente. Storage (fotos) é removido depois, pelo '
  'chamador, com os paths devolvidos aqui.';

-- Executável por qualquer papel autenticado ou anon — o gate real é o
-- `IF NOT (...) THEN RAISE EXCEPTION` acima + a RLS de cada DELETE, não o
-- GRANT (mesma superfície de quem já podia fazer estes DELETEs diretamente
-- antes desta migration).
GRANT EXECUTE ON FUNCTION public.danger_zone_clear_financials(uuid) TO anon, authenticated;
