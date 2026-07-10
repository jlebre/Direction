-- 020_precos_ingrediente_link.sql
-- Liga preços à tabela de ingredientes para rastreio de origem.
-- SEGURO: ADD COLUMN nullable — sem DROP, sem DEFAULT destrutivo.

ALTER TABLE precos ADD COLUMN IF NOT EXISTS ingrediente_id UUID REFERENCES ingredientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_precos_ingrediente_id ON precos(ingrediente_id);
