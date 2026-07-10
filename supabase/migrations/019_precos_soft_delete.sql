-- 019_precos_soft_delete.sql
-- Soft delete para preços e suporte a preço nulo (ingredientes criados sem preço).
-- SEGURO: ADD COLUMN e ALTER COLUMN DROP NOT NULL — sem DROP, sem truncation.

-- Soft delete
ALTER TABLE precos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Preço opcional — entradas criadas a partir de receitas ainda sem preço conhecido
ALTER TABLE precos ALTER COLUMN preco DROP NOT NULL;

-- Index para filtrar não-apagados (caso mais comum)
CREATE INDEX IF NOT EXISTS idx_precos_deleted_at ON precos(deleted_at) WHERE deleted_at IS NULL;
