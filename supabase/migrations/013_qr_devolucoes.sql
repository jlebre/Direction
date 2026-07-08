-- 013_qr_devolucoes.sql
-- Adiciona campos QR Code e origin a despesas + tabela separada devolucoes.
-- SEGURO: apenas ADD COLUMN e CREATE TABLE — sem DROP, sem destructive.
-- Requer migration 012 já aplicada.
--
-- Campos QR seguem o formato da fatura portuguesa:
--   A = nif_emitente, B = nif_adquirente, F = data (YYYYMMDD),
--   G = numero_documento, H = atcud, O = total

-- ── Campos QR Code em despesas ──────────────────────────────────────────────
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_raw                TEXT;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_total              NUMERIC;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_data               DATE;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_nif_emitente       TEXT;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_nif_adquirente     TEXT;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_numero_documento   TEXT;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_atcud              TEXT;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS qr_tipo_documento     TEXT;

-- Origem dos dados: como foram obtidos os valores da fatura
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS origem_dados TEXT DEFAULT 'manual'
  CONSTRAINT despesas_origem_dados_check
    CHECK (origem_dados IN ('manual', 'ocr', 'qr_code'));

-- NIF visível: se conseguimos ler/detetar o NIF na fatura (distinto de nif_confirmado)
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS nif_visivel BOOLEAN DEFAULT FALSE;

-- ── Tabela devolucoes (Option C — tabela separada) ───────────────────────────
CREATE TABLE IF NOT EXISTS devolucoes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id             UUID NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  fatura_original_id   UUID REFERENCES despesas(id) ON DELETE SET NULL,
  numero_devolucao     INTEGER NOT NULL,
  data                 DATE NOT NULL,
  valor                NUMERIC NOT NULL CHECK (valor > 0),
  descricao            TEXT,
  codigo               TEXT,
  codigo_descricao     TEXT,
  foto_path            TEXT,
  -- QR da nota de devolução, se existir
  qr_raw               TEXT,
  qr_total             NUMERIC,
  qr_atcud             TEXT,
  origem_dados         TEXT DEFAULT 'manual'
    CONSTRAINT devolucoes_origem_dados_check
      CHECK (origem_dados IN ('manual', 'ocr', 'qr_code')),
  notas                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS devolucoes_campo_id_idx
  ON devolucoes(campo_id);
CREATE INDEX IF NOT EXISTS devolucoes_fatura_original_id_idx
  ON devolucoes(fatura_original_id);
CREATE UNIQUE INDEX IF NOT EXISTS devolucoes_numero_campo_idx
  ON devolucoes(campo_id, numero_devolucao);

ALTER TABLE devolucoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON devolucoes;
CREATE POLICY "public_all" ON devolucoes
  FOR ALL USING (true) WITH CHECK (true);
