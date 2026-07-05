-- Migration 004: Sistema de regularização NIF por fatura associada
--
-- IMPACTO:
--   - ADD COLUMN despesas.is_regularizacao_nif (não destrutivo, default FALSE)
--   - CREATE TABLE regularizacoes_nif (nova tabela, liga fatura original ↔ fatura NIF)
--   - A tabela liquidacoes_nif existente NÃO é alterada nem apagada
--
-- SEGURO: todas as operações são idempotentes (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- 1. Coluna para identificar faturas de regularização NIF
ALTER TABLE despesas
  ADD COLUMN IF NOT EXISTS is_regularizacao_nif BOOLEAN DEFAULT FALSE;

-- 2. Tabela de ligação: fatura original (sem NIF) ↔ fatura de regularização (com NIF)
--
--    despesa_regularizacao_id → a nova fatura com NIF criada para regularizar
--    despesa_original_id      → a fatura sem NIF que está a ser regularizada
--    valor                    → montante desta regularização (pode ser parcial)
--
--    CASCADE: se qualquer das despesas for eliminada, o registo de ligação desaparece
CREATE TABLE IF NOT EXISTS regularizacoes_nif (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campo_id                 UUID REFERENCES campos(id)   ON DELETE CASCADE NOT NULL,
  despesa_regularizacao_id UUID REFERENCES despesas(id) ON DELETE CASCADE NOT NULL,
  despesa_original_id      UUID REFERENCES despesas(id) ON DELETE CASCADE NOT NULL,
  valor                    NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_nif_orig  ON regularizacoes_nif(despesa_original_id);
CREATE INDEX IF NOT EXISTS idx_reg_nif_reg   ON regularizacoes_nif(despesa_regularizacao_id);
CREATE INDEX IF NOT EXISTS idx_reg_nif_campo ON regularizacoes_nif(campo_id);

ALTER TABLE regularizacoes_nif ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público regularizacoes_nif"
  ON regularizacoes_nif
  FOR ALL
  USING (true)
  WITH CHECK (true);
