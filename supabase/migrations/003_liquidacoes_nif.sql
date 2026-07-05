-- Fase 2: tabela de liquidações da bolsa NIF
CREATE TABLE IF NOT EXISTS liquidacoes_nif (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campo_id UUID REFERENCES campos(id) ON DELETE CASCADE NOT NULL,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liquidacoes_nif_campo ON liquidacoes_nif(campo_id);

ALTER TABLE liquidacoes_nif ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público liquidacoes_nif"
  ON liquidacoes_nif FOR ALL
  USING (true) WITH CHECK (true);
