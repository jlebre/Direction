-- Suporte a transporte combinado (múltiplos segmentos por transporte).
-- Idempotente.

-- Flag de transporte combinado
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS is_combinado BOOLEAN NOT NULL DEFAULT false;

-- Tabela de segmentos
CREATE TABLE IF NOT EXISTS transporte_segmentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporte_id    UUID NOT NULL REFERENCES transportes(id) ON DELETE CASCADE,
  campo_id         UUID NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  tipo_transporte  TEXT NOT NULL DEFAULT 'autocarro'
                   CHECK (tipo_transporte IN ('autocarro', 'comboio', 'aviao', 'barco', 'outro')),
  origem           TEXT NOT NULL,
  destino          TEXT NOT NULL,
  data             DATE,
  hora_partida     TIME,
  hora_chegada     TIME,
  operador         TEXT,
  numero_referencia TEXT,
  observacoes      TEXT,
  ordem            INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transporte_segmentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "segmentos_all" ON transporte_segmentos;
CREATE POLICY "segmentos_all" ON transporte_segmentos
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
