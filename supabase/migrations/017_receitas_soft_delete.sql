-- Soft delete para receitas.
-- Quando deleted_at IS NOT NULL, a receita está apagada.
-- Idempotente: IF NOT EXISTS não falha se a coluna já existir.
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
