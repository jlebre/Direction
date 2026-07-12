-- Adiciona suporte a slots pré-definidos de transporte (Ida/Volta com Lisboa/Porto/Coimbra).
-- Idempotente.

-- Estender CHECK constraint do estado para incluir por_configurar e concluido
ALTER TABLE transportes DROP CONSTRAINT IF EXISTS transportes_estado_check;
ALTER TABLE transportes ADD CONSTRAINT transportes_estado_check
  CHECK (estado IN ('por_configurar', 'pendente', 'confirmado', 'concluido', 'cancelado'));

-- Colunas de slot
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS is_slot_padrao BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS slot_key TEXT;

-- Índice único por campo_id + slot_key (só quando slot_key não é null)
CREATE UNIQUE INDEX IF NOT EXISTS transportes_campo_slot_key_unique
  ON transportes (campo_id, slot_key)
  WHERE slot_key IS NOT NULL;
