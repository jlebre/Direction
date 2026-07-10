-- ============================================================
-- 021_pending_backlog.sql
-- Aplica todas as alterações pendentes de forma segura (idempotente).
-- Executar no Supabase SQL Editor se as migrations 018/019/020
-- ainda não foram aplicadas à base de dados.
-- ============================================================

-- 018: Flag de verificação de quantidades nas receitas
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS quantidades_verificadas boolean NOT NULL DEFAULT false;

-- 019: Soft delete + preço opcional na tabela de preços
ALTER TABLE precos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE precos ALTER COLUMN preco DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_precos_deleted_at ON precos(deleted_at) WHERE deleted_at IS NULL;

-- 020: Ligação FK entre preços e ingredientes
ALTER TABLE precos ADD COLUMN IF NOT EXISTS ingrediente_id UUID REFERENCES ingredientes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_precos_ingrediente_id ON precos(ingrediente_id);
