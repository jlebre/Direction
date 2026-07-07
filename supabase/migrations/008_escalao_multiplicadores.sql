-- 008_escalao_multiplicadores.sql
-- Multiplicadores de quantidade por escalão.
-- Permite ajustar as quantidades calculadas conforme o apetite médio de cada escalão.
-- SEGURO: nova tabela, não altera nada existente.

CREATE TABLE IF NOT EXISTS escalao_multiplicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalao text NOT NULL,
  multiplicador numeric NOT NULL DEFAULT 1.0
    CHECK (multiplicador > 0 AND multiplicador <= 5),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(escalao)
);

CREATE INDEX IF NOT EXISTS escalao_multiplicadores_escalao_idx
  ON escalao_multiplicadores(escalao);

ALTER TABLE escalao_multiplicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON escalao_multiplicadores;
CREATE POLICY "public_all" ON escalao_multiplicadores
  FOR ALL USING (true) WITH CHECK (true);

-- Seed de valores padrão (idempotente)
INSERT INTO escalao_multiplicadores (escalao, multiplicador, notas) VALUES
  ('Mosquito',  0.75, 'Escalão mais jovem — menor apetite'),
  ('Aranhiço',  0.85, NULL),
  ('Melga',     1.00, 'Referência base (58 pessoas)'),
  ('Tremelga',  1.10, NULL),
  ('Camaleão',  1.20, 'Escalão mais velho — maior apetite')
ON CONFLICT (escalao) DO NOTHING;
