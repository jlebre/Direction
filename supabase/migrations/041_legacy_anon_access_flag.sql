-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2.4 (transição por campo) — flag explícita de exceção legacy
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `campos.legacy_anon_access` é a ÚNICA forma de um campo continuar a ter
-- acesso anon total (equivalente ao comportamento de hoje) depois da subfase
-- 2.4 apertar a RLS. Nunca uma policy `USING (true)` global — cada policy
-- restritiva passa a verificar EXPLICITAMENTE esta coluna, por camp_id,
-- via a função has_legacy_anon_access() abaixo.
--
-- TEMPORÁRIO POR DESENHO — não é arquitetura permanente:
--   - Esta coluna só existe para a transição. Critério de remoção: quando o
--     último campo tiver pelo menos um adjunto ativo (ou for confirmado como
--     fechado), TODAS as linhas ficam `false` e esta coluna + a função +
--     os ramos "OR has_legacy_anon_access(...)" de cada policy são removidos
--     numa migration de "Contract" — ver docs/v2/MIGRATION_STRATEGY.md.
--   - Nenhum campo fica `true` por omissão a partir de agora: o valor de
--     cada campo é decidido explicitamente por José, campo a campo (ver
--     UPDATE em separado, nunca nesta migration — esta só cria o mecanismo).
--
-- FORWARD:      este ficheiro (só cria a coluna + função + índice; não
--               altera nenhuma policy existente, não altera dados).
-- ROLLBACK:     supabase/rollbacks/041_legacy_anon_access_flag_rollback.sql
-- VERIFICATION: leitura direta; nenhum comportamento muda até a migration 042
--               (que ainda não corre) trocar as policies.
--
-- Idempotente.

ALTER TABLE campos ADD COLUMN IF NOT EXISTS legacy_anon_access BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN campos.legacy_anon_access IS
  'TEMPORÁRIO (Fase 2.4, transição por campo). true = este campo específico '
  'continua com acesso anon total (comportamento legacy), enquanto não tiver '
  'pelo menos uma membership adjunto ativa. Nunca usar como padrão — cada '
  'valor é decidido explicitamente, campo a campo, por José. Esta coluna e '
  'as suas referências nas policies são removidas por completo quando o '
  'último campo for migrado (ver MIGRATION_STRATEGY.md).';

CREATE INDEX IF NOT EXISTS campos_legacy_anon_access_idx ON campos (legacy_anon_access) WHERE legacy_anon_access = true;

-- SECURITY DEFINER pelo mesmo motivo dos outros helpers (039): usado dentro
-- de policies de outras tabelas, tem de poder ler `campos` sem depender da
-- RLS de `campos` já ter sido avaliada para o mesmo utilizador.
CREATE OR REPLACE FUNCTION public.has_legacy_anon_access(target_camp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campos WHERE id = target_camp_id AND legacy_anon_access = true
  );
$$;
