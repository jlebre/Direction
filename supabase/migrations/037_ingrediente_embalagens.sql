-- Conversão entre unidade de receita e unidade de compra.
-- Permite que 4 cubos de caldo se convertam em 1 pacote de 12 cubos.
-- UNIQUE(ingrediente_id, unidade_receita): um ingrediente pode ter conversões
-- diferentes para diferentes unidades de receita (ex: cubos e ml para o mesmo produto).
-- Idempotente.

CREATE TABLE IF NOT EXISTS ingrediente_embalagens (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingrediente_id          UUID NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  unidade_receita         TEXT NOT NULL,
  unidade_compra          TEXT NOT NULL,
  quantidade_por_embalagem NUMERIC(10,4) NOT NULL CHECK (quantidade_por_embalagem > 0),
  regra_arredondamento    TEXT NOT NULL DEFAULT 'cima'
                          CHECK (regra_arredondamento IN ('cima', 'baixo', 'proximo')),
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ingrediente_id, unidade_receita)
);

ALTER TABLE ingrediente_embalagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emb_all" ON ingrediente_embalagens;
CREATE POLICY "emb_all" ON ingrediente_embalagens
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
