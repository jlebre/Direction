-- Migration 014: farmacia/restricoes sem animados obrigatório
-- Additive only — sem DROP, sem destruição de dados

-- ── farmacia_medicacoes ─────────────────────────────────────────────────────
ALTER TABLE farmacia_medicacoes ADD COLUMN IF NOT EXISTS campo_id UUID REFERENCES campos(id) ON DELETE CASCADE;
ALTER TABLE farmacia_medicacoes ADD COLUMN IF NOT EXISTS crianca_nome TEXT;
ALTER TABLE farmacia_medicacoes ADD COLUMN IF NOT EXISTS dose TEXT;
ALTER TABLE farmacia_medicacoes ALTER COLUMN animado_id DROP NOT NULL;

-- Backfill campo_id e crianca_nome a partir de animados (linhas antigas)
UPDATE farmacia_medicacoes fm
SET
  campo_id   = a.campo_id,
  crianca_nome = COALESCE(fm.crianca_nome, a.nome)
FROM animados a
WHERE fm.animado_id = a.id
  AND fm.campo_id IS NULL;

-- ── contactos_emergencia ────────────────────────────────────────────────────
ALTER TABLE contactos_emergencia ADD COLUMN IF NOT EXISTS campo_id UUID REFERENCES campos(id) ON DELETE CASCADE;
ALTER TABLE contactos_emergencia ADD COLUMN IF NOT EXISTS crianca_nome TEXT;
ALTER TABLE contactos_emergencia ALTER COLUMN animado_id DROP NOT NULL;

UPDATE contactos_emergencia ce
SET
  campo_id     = a.campo_id,
  crianca_nome = COALESCE(ce.crianca_nome, a.nome)
FROM animados a
WHERE ce.animado_id = a.id
  AND ce.campo_id IS NULL;

-- ── restricoes_alimentares ──────────────────────────────────────────────────
ALTER TABLE restricoes_alimentares ADD COLUMN IF NOT EXISTS campo_id UUID REFERENCES campos(id) ON DELETE CASCADE;
ALTER TABLE restricoes_alimentares ADD COLUMN IF NOT EXISTS crianca_nome TEXT;
ALTER TABLE restricoes_alimentares ADD COLUMN IF NOT EXISTS gravidade TEXT
  CHECK (gravidade IN ('leve', 'media', 'grave'));
ALTER TABLE restricoes_alimentares ALTER COLUMN animado_id DROP NOT NULL;

UPDATE restricoes_alimentares ra
SET
  campo_id     = a.campo_id,
  crianca_nome = COALESCE(ra.crianca_nome, a.nome)
FROM animados a
WHERE ra.animado_id = a.id
  AND ra.campo_id IS NULL;

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_farmacia_med_campo_id    ON farmacia_medicacoes(campo_id);
CREATE INDEX IF NOT EXISTS idx_contactos_campo_id       ON contactos_emergencia(campo_id);
CREATE INDEX IF NOT EXISTS idx_restricoes_campo_id      ON restricoes_alimentares(campo_id);

-- ── tomas_medicacao ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tomas_medicacao (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicacao_id          UUID NOT NULL REFERENCES farmacia_medicacoes(id) ON DELETE CASCADE,
  data_hora_prevista    TIMESTAMPTZ NOT NULL,
  data_hora_administrada TIMESTAMPTZ,
  estado                TEXT NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'administrado', 'falhado', 'adiado')),
  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tomas_medicacao_id    ON tomas_medicacao(medicacao_id);
CREATE INDEX IF NOT EXISTS idx_tomas_data_hora       ON tomas_medicacao(data_hora_prevista);

ALTER TABLE tomas_medicacao ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tomas_medicacao' AND policyname = 'Authenticated users manage tomas'
  ) THEN
    CREATE POLICY "Authenticated users manage tomas" ON tomas_medicacao
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
