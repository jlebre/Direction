-- 012_ingredientes_tipo_produto.sql
-- Adiciona tipo_produto a ingredientes + tabela escalao_fatores_quantidade.
-- SEGURO: só ADD COLUMN com default e nova tabela — nada é removido.
--
-- tipo_produto determina qual fator de escalão aplicar ao ingrediente.
-- Exemplos: Massa fusilli → massa, Arroz carolino → arroz, Peito de frango → carne

ALTER TABLE ingredientes
  ADD COLUMN IF NOT EXISTS tipo_produto TEXT NOT NULL DEFAULT 'outro'
  CONSTRAINT ingredientes_tipo_produto_check
    CHECK (tipo_produto IN ('massa','arroz','carne','atum','pao','sopa','bolachas','outro'));

-- Tabela de fatores por escalão × tipo de produto
CREATE TABLE IF NOT EXISTS escalao_fatores_quantidade (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalao              TEXT NOT NULL,
  tipo_produto         TEXT NOT NULL
    CONSTRAINT escalao_fatores_tipo_check
      CHECK (tipo_produto IN ('massa','arroz','carne','atum','pao','sopa','bolachas','outro')),
  fator                NUMERIC NOT NULL DEFAULT 1.0
    CHECK (fator > 0 AND fator <= 5),
  quantidade_referencia NUMERIC,        -- quantidade Melgas para 58 pax (documentação)
  unidade_referencia   TEXT,
  notas                TEXT,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(escalao, tipo_produto)
);

CREATE INDEX IF NOT EXISTS escalao_fatores_escalao_idx
  ON escalao_fatores_quantidade(escalao);

ALTER TABLE escalao_fatores_quantidade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON escalao_fatores_quantidade;
CREATE POLICY "public_all" ON escalao_fatores_quantidade
  FOR ALL USING (true) WITH CHECK (true);
