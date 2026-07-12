-- Tabela de locais geridos no admin (não hardcoded).
-- Idempotente.

CREATE TABLE IF NOT EXISTS locais (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  morada      TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE locais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locais_all" ON locais;
CREATE POLICY "locais_all" ON locais
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
