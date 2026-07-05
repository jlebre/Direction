-- Fix 1: receita_ingredientes precisa de unique constraint para o seed ser idempotente
ALTER TABLE receita_ingredientes
  ADD CONSTRAINT receita_ingredientes_unique
  UNIQUE (receita_id, ingrediente_id);

-- Fix 2: campo_precos.campo_id precisa de aceitar NULL (preços de referência globais)
ALTER TABLE campo_precos ALTER COLUMN campo_id DROP NOT NULL;
