-- Suporte a pratos alternativos no plano de refeições.
-- is_alternativa: marca esta entrada como prato alternativo (não o prato normal).
-- alternativa_para: aponta para o ementa.id do prato normal a que esta alternativa corresponde.
-- ementa_alternativa_restricoes: quais restrições são cobertas por esta alternativa.
-- Idempotente.

ALTER TABLE ementa ADD COLUMN IF NOT EXISTS is_alternativa BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ementa ADD COLUMN IF NOT EXISTS alternativa_para UUID REFERENCES ementa(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ementa_alternativa_restricoes (
  ementa_id    UUID NOT NULL REFERENCES ementa(id) ON DELETE CASCADE,
  restricao_id UUID NOT NULL REFERENCES restricoes_alimentares(id) ON DELETE CASCADE,
  PRIMARY KEY (ementa_id, restricao_id)
);

ALTER TABLE ementa_alternativa_restricoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ear_all" ON ementa_alternativa_restricoes;
CREATE POLICY "ear_all" ON ementa_alternativa_restricoes
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
