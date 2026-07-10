-- Migration 023: dias editáveis por campo
-- Tabela overlay não-destrutiva: ementa.dia (INTEGER) mantém-se como chave;
-- campo_dias.ordem = ementa.dia (ex: -2, -1, 1, 2, ..., 10, 11, ...)
-- Se não existirem entradas para um campo, a UI usa o comportamento legado (getDiaLabel + getNumDias).

CREATE TABLE IF NOT EXISTS campo_dias (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id   UUID        NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  ordem      INTEGER     NOT NULL,
  nome       TEXT,
  data       DATE,
  tipo       TEXT        NOT NULL DEFAULT 'campo',
  ativo      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campo_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_campo_dias_campo ON campo_dias(campo_id, ordem);

ALTER TABLE campo_dias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_campo_dias" ON campo_dias
  FOR ALL USING (true) WITH CHECK (true);
