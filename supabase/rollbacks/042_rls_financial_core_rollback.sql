-- ROLLBACK de 042_rls_financial_core.sql — NÃO aplicado automaticamente.
--
-- Restaura literalmente as policies originais (USING(true), sem exceção)
-- em campos/despesas/despesa_linhas/devolucoes/regularizacoes_nif/
-- liquidacoes_nif. NÃO reverte a UPDATE de legacy_anon_access (inofensiva
-- por si só — só passa a ter efeito de novo se este rollback for aplicado).
--
-- Usar isto só se, depois da 042, "utilizadores legítimos deixarem de
-- conseguir trabalhar" de forma inesperada nalgum campo marcado
-- legacy_anon_access=true (não deveria acontecer — nesse caso o mais
-- provável é um bug na função has_legacy_anon_access() ou has_camp_access(),
-- não a estratégia em si).

DROP POLICY IF EXISTS "campos_select" ON campos;
DROP POLICY IF EXISTS "campos_insert" ON campos;
DROP POLICY IF EXISTS "campos_update" ON campos;
DROP POLICY IF EXISTS "campos_delete" ON campos;
CREATE POLICY "public_all" ON campos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "despesas_select" ON despesas;
DROP POLICY IF EXISTS "despesas_insert" ON despesas;
DROP POLICY IF EXISTS "despesas_update" ON despesas;
DROP POLICY IF EXISTS "despesas_delete" ON despesas;
CREATE POLICY "public_all" ON despesas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "despesa_linhas_select" ON despesa_linhas;
DROP POLICY IF EXISTS "despesa_linhas_insert" ON despesa_linhas;
DROP POLICY IF EXISTS "despesa_linhas_update" ON despesa_linhas;
DROP POLICY IF EXISTS "despesa_linhas_delete" ON despesa_linhas;
CREATE POLICY "public_all" ON despesa_linhas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "devolucoes_select" ON devolucoes;
DROP POLICY IF EXISTS "devolucoes_insert" ON devolucoes;
DROP POLICY IF EXISTS "devolucoes_update" ON devolucoes;
DROP POLICY IF EXISTS "devolucoes_delete" ON devolucoes;
CREATE POLICY "public_all" ON devolucoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "regularizacoes_nif_select" ON regularizacoes_nif;
DROP POLICY IF EXISTS "regularizacoes_nif_insert" ON regularizacoes_nif;
DROP POLICY IF EXISTS "regularizacoes_nif_update" ON regularizacoes_nif;
DROP POLICY IF EXISTS "regularizacoes_nif_delete" ON regularizacoes_nif;
CREATE POLICY "Acesso público regularizacoes_nif" ON regularizacoes_nif FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "liquidacoes_nif_select" ON liquidacoes_nif;
DROP POLICY IF EXISTS "liquidacoes_nif_insert" ON liquidacoes_nif;
DROP POLICY IF EXISTS "liquidacoes_nif_update" ON liquidacoes_nif;
DROP POLICY IF EXISTS "liquidacoes_nif_delete" ON liquidacoes_nif;
CREATE POLICY "Acesso público liquidacoes_nif" ON liquidacoes_nif FOR ALL USING (true) WITH CHECK (true);
