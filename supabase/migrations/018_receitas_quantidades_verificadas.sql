-- Adiciona flag de verificação de quantidades às receitas.
-- Default FALSE → todas as receitas existentes ficam "por verificar".
-- A Mamã revê as quantidades de cada receita e marca como verificada.
-- Idempotente via IF NOT EXISTS.
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS quantidades_verificadas boolean NOT NULL DEFAULT false;
