-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2.4 — RLS restritiva no núcleo financeiro, com transição por campo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Substitui as policies "public_all"/"Acesso público *" (USING(true), sem
-- exceção) por policies que só permitem acesso:
--   (a) a quem tem posse real (has_camp_access/can_edit_camp/is_admin/
--       is_treasurer, via profiles+camp_memberships — migrations 038-039), OU
--   (b) ao campo específico estar marcado has_legacy_anon_access(campo_id)
--       — migration 041, NUNCA um `OR true` global.
--
-- DECISÃO EXPLÍCITA (José, nesta ronda): os 11 campos reais existentes ficam
-- TODOS com legacy_anon_access = true por agora — zero campos fecham nesta
-- migration. O comportamento observável não muda para nenhum campo real
-- hoje; o que muda é a ARQUITETURA: de "aberto para todos, sempre" para
-- "aberto por decisão explícita, por campo, revogável a qualquer momento
-- via /admin/memberships sem nova migration".
--
-- FORWARD:      este ficheiro.
-- ROLLBACK:     supabase/rollbacks/042_rls_financial_core_rollback.sql
--               (restaura literalmente as policies USING(true) originais).
-- VERIFICATION: tests/security/rls-matrix.test.ts deve continuar a mostrar
--               os mesmos resultados de hoje para anon/adjunto_A/adjunto_B
--               em campos de teste com legacy_anon_access=false (o default
--               para campos NOVOS, incluindo os de teste) — e
--               tests/security/anon-read-baseline.test.ts deve continuar
--               "expected fail" só enquanto os 11 campos reais estiverem
--               todos legacy=true (é o caso agora); assim que o primeiro
--               campo fechar, essa baseline passa a precisar de exceção
--               documentada.
--
-- Idempotente.

-- ── 1. Decisão explícita, campo a campo (não um default global) ───────────
UPDATE campos SET legacy_anon_access = true
WHERE nome IN (
  'Camaleões', 'Melgas I', 'Melgas II', 'Melgas III',
  'Aranhiços I', 'Aranhiços II', 'Aranhiços III',
  'Tremelgas I', 'Tremelgas II', 'Mosquitos I', 'Mosquitos II'
);
-- Qualquer campo criado depois desta migration (incluindo os "[TEST] Camp
-- A/B" do harness) fica false por omissão — nunca legacy sem decisão.

-- ── 2. campos ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "public_all" ON campos;

DROP POLICY IF EXISTS "campos_select" ON campos;
CREATE POLICY "campos_select" ON campos
  FOR SELECT
  USING (has_camp_access(id) OR has_legacy_anon_access(id));

-- INSERT (criar campo novo) fica deliberadamente permissivo nesta migration
-- — não há ainda camp_id para verificar posse, e a criação de campos hoje
-- só acontece pela UI legacy de /admin (CamposAdminClient), que usa o
-- cliente anon simples, não o cliente de sessão. Migrar isto é subfase 2.6
-- (Server Boundary), não 2.4.
DROP POLICY IF EXISTS "campos_insert" ON campos;
CREATE POLICY "campos_insert" ON campos
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "campos_update" ON campos;
CREATE POLICY "campos_update" ON campos
  FOR UPDATE
  USING (can_edit_camp(id) OR has_legacy_anon_access(id))
  WITH CHECK (can_edit_camp(id) OR has_legacy_anon_access(id));

DROP POLICY IF EXISTS "campos_delete" ON campos;
CREATE POLICY "campos_delete" ON campos
  FOR DELETE
  USING (is_admin());

-- ── 3. despesas ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "public_all" ON despesas;

DROP POLICY IF EXISTS "despesas_select" ON despesas;
CREATE POLICY "despesas_select" ON despesas
  FOR SELECT
  USING (has_camp_access(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "despesas_insert" ON despesas;
CREATE POLICY "despesas_insert" ON despesas
  FOR INSERT
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "despesas_update" ON despesas;
CREATE POLICY "despesas_update" ON despesas
  FOR UPDATE
  USING (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id))
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "despesas_delete" ON despesas;
CREATE POLICY "despesas_delete" ON despesas
  FOR DELETE
  USING (is_admin() OR is_treasurer() OR has_legacy_anon_access(campo_id));

-- ── 4. despesa_linhas (sem campo_id direto — via despesas.campo_id) ────────
DROP POLICY IF EXISTS "public_all" ON despesa_linhas;

DROP POLICY IF EXISTS "despesa_linhas_select" ON despesa_linhas;
CREATE POLICY "despesa_linhas_select" ON despesa_linhas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM despesas d
      WHERE d.id = despesa_linhas.despesa_id
        AND (has_camp_access(d.campo_id) OR has_legacy_anon_access(d.campo_id))
    )
  );

DROP POLICY IF EXISTS "despesa_linhas_insert" ON despesa_linhas;
CREATE POLICY "despesa_linhas_insert" ON despesa_linhas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM despesas d
      WHERE d.id = despesa_linhas.despesa_id
        AND (can_edit_camp(d.campo_id) OR has_legacy_anon_access(d.campo_id))
    )
  );

DROP POLICY IF EXISTS "despesa_linhas_update" ON despesa_linhas;
CREATE POLICY "despesa_linhas_update" ON despesa_linhas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM despesas d
      WHERE d.id = despesa_linhas.despesa_id
        AND (can_edit_camp(d.campo_id) OR has_legacy_anon_access(d.campo_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM despesas d
      WHERE d.id = despesa_linhas.despesa_id
        AND (can_edit_camp(d.campo_id) OR has_legacy_anon_access(d.campo_id))
    )
  );

DROP POLICY IF EXISTS "despesa_linhas_delete" ON despesa_linhas;
CREATE POLICY "despesa_linhas_delete" ON despesa_linhas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM despesas d
      WHERE d.id = despesa_linhas.despesa_id
        AND (is_admin() OR is_treasurer() OR has_legacy_anon_access(d.campo_id))
    )
  );

-- ── 5. devolucoes ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "public_all" ON devolucoes;

DROP POLICY IF EXISTS "devolucoes_select" ON devolucoes;
CREATE POLICY "devolucoes_select" ON devolucoes
  FOR SELECT
  USING (has_camp_access(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "devolucoes_insert" ON devolucoes;
CREATE POLICY "devolucoes_insert" ON devolucoes
  FOR INSERT
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "devolucoes_update" ON devolucoes;
CREATE POLICY "devolucoes_update" ON devolucoes
  FOR UPDATE
  USING (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id))
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "devolucoes_delete" ON devolucoes;
CREATE POLICY "devolucoes_delete" ON devolucoes
  FOR DELETE
  USING (is_admin() OR is_treasurer() OR has_legacy_anon_access(campo_id));

-- ── 6. regularizacoes_nif ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acesso público regularizacoes_nif" ON regularizacoes_nif;

DROP POLICY IF EXISTS "regularizacoes_nif_select" ON regularizacoes_nif;
CREATE POLICY "regularizacoes_nif_select" ON regularizacoes_nif
  FOR SELECT
  USING (has_camp_access(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "regularizacoes_nif_insert" ON regularizacoes_nif;
CREATE POLICY "regularizacoes_nif_insert" ON regularizacoes_nif
  FOR INSERT
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "regularizacoes_nif_update" ON regularizacoes_nif;
CREATE POLICY "regularizacoes_nif_update" ON regularizacoes_nif
  FOR UPDATE
  USING (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id))
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "regularizacoes_nif_delete" ON regularizacoes_nif;
CREATE POLICY "regularizacoes_nif_delete" ON regularizacoes_nif
  FOR DELETE
  USING (is_admin() OR is_treasurer() OR has_legacy_anon_access(campo_id));

-- ── 7. liquidacoes_nif ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acesso público liquidacoes_nif" ON liquidacoes_nif;

DROP POLICY IF EXISTS "liquidacoes_nif_select" ON liquidacoes_nif;
CREATE POLICY "liquidacoes_nif_select" ON liquidacoes_nif
  FOR SELECT
  USING (has_camp_access(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "liquidacoes_nif_insert" ON liquidacoes_nif;
CREATE POLICY "liquidacoes_nif_insert" ON liquidacoes_nif
  FOR INSERT
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "liquidacoes_nif_update" ON liquidacoes_nif;
CREATE POLICY "liquidacoes_nif_update" ON liquidacoes_nif
  FOR UPDATE
  USING (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id))
  WITH CHECK (can_edit_camp(campo_id) OR has_legacy_anon_access(campo_id));

DROP POLICY IF EXISTS "liquidacoes_nif_delete" ON liquidacoes_nif;
CREATE POLICY "liquidacoes_nif_delete" ON liquidacoes_nif
  FOR DELETE
  USING (is_admin() OR is_treasurer() OR has_legacy_anon_access(campo_id));
