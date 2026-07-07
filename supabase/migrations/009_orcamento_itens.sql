-- 009_orcamento_itens.sql
-- Extras manuais do orçamento por campo (limpeza, miminhos, consumíveis, etc.).
-- SEGURO: nova tabela, não altera nada existente.

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id uuid NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'outro',
  nome text NOT NULL,
  quantidade numeric,
  unidade text,
  preco_unit numeric,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orcamento_itens_campo_idx
  ON orcamento_itens(campo_id);

ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON orcamento_itens;
CREATE POLICY "public_all" ON orcamento_itens
  FOR ALL USING (true) WITH CHECK (true);
