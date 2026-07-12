-- Valores de referência dos orçamentos por escalão/ano, editáveis no admin.
-- A app usa os valores da DB quando existem, caindo para os hardcoded em valores-referencia.ts.
-- Idempotente.

CREATE TABLE IF NOT EXISTS valores_referencia (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalao   TEXT NOT NULL,
  ano       INTEGER NOT NULL DEFAULT 2026,
  codigo    TEXT NOT NULL,
  valor     NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valores_ref_unique UNIQUE (escalao, ano, codigo)
);

ALTER TABLE valores_referencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "valores_ref_all" ON valores_referencia;
CREATE POLICY "valores_ref_all" ON valores_referencia
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_valores_ref_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS valores_ref_updated_at ON valores_referencia;
CREATE TRIGGER valores_ref_updated_at
  BEFORE UPDATE ON valores_referencia
  FOR EACH ROW EXECUTE FUNCTION update_valores_ref_updated_at();
