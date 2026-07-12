-- Tabela de ligação entre restrições alimentares e ingredientes do catálogo.
-- Permite cruzamento automático por ID (FK) em vez de só texto livre.
-- O campo ingredientes_proibidos TEXT[] mantém-se para display legacy e fallback.
-- Idempotente.

CREATE TABLE IF NOT EXISTS restricao_ingredientes (
  restricao_id   UUID NOT NULL REFERENCES restricoes_alimentares(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  PRIMARY KEY (restricao_id, ingrediente_id)
);

ALTER TABLE restricao_ingredientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ri_all" ON restricao_ingredientes;
CREATE POLICY "ri_all" ON restricao_ingredientes
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
