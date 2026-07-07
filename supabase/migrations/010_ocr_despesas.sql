-- 010_ocr_despesas.sql
-- OCR de faturas: campos na tabela despesas + linhas de produto + aliases.
-- SEGURO: só adiciona colunas nullable e novas tabelas — dados existentes intactos.

-- ── Campos OCR na tabela despesas ─────────────────────────────────────────────

ALTER TABLE despesas
  ADD COLUMN IF NOT EXISTS ocr_status     TEXT    DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS ocr_texto      TEXT,
  ADD COLUMN IF NOT EXISTS ocr_fornecedor TEXT,
  ADD COLUMN IF NOT EXISTS ocr_total      NUMERIC,
  ADD COLUMN IF NOT EXISTS ocr_data       DATE;

-- Valores válidos de ocr_status: 'nenhum' | 'processado' | 'falhou'

-- ── Linhas de produto extraídas por OCR ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS despesa_linhas (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  despesa_id            uuid        NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
  texto_linha_original  TEXT        NOT NULL,
  nome_produto_bruto    TEXT        NOT NULL,
  ingrediente_id        uuid        REFERENCES ingredientes(id)   ON DELETE SET NULL,
  campo_preco_id        uuid        REFERENCES campo_precos(id)   ON DELETE SET NULL,
  quantidade            NUMERIC,
  unidade               TEXT,
  preco_unitario        NUMERIC,
  preco_total           NUMERIC,
  confianca             TEXT        DEFAULT 'media',   -- 'alta' | 'media' | 'baixa'
  estado                TEXT        DEFAULT 'sugerido',-- 'sugerido' | 'confirmado' | 'corrigido' | 'ignorado'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS despesa_linhas_despesa_idx ON despesa_linhas(despesa_id);
CREATE INDEX IF NOT EXISTS despesa_linhas_ingrediente_idx ON despesa_linhas(ingrediente_id);

ALTER TABLE despesa_linhas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON despesa_linhas;
CREATE POLICY "public_all" ON despesa_linhas FOR ALL USING (true) WITH CHECK (true);

-- ── Aliases de produtos OCR ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS produto_aliases (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alias          TEXT        NOT NULL UNIQUE,
  ingrediente_id uuid        REFERENCES ingredientes(id) ON DELETE CASCADE,
  campo_preco_id uuid        REFERENCES campo_precos(id) ON DELETE CASCADE,
  origem         TEXT        DEFAULT 'ocr',  -- 'ocr' | 'manual'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS produto_aliases_alias_idx ON produto_aliases(alias);

ALTER TABLE produto_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON produto_aliases;
CREATE POLICY "public_all" ON produto_aliases FOR ALL USING (true) WITH CHECK (true);
