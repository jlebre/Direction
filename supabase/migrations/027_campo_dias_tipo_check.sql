-- Adiciona CHECK constraint ao campo_dias.tipo com os valores válidos
-- Idempotente: remove constraint existente primeiro se houver
ALTER TABLE campo_dias
DROP CONSTRAINT IF EXISTS campo_dias_tipo_check;

ALTER TABLE campo_dias
ADD CONSTRAINT campo_dias_tipo_check
CHECK (tipo IN ('campo', 'precampo', 'fds_preparacao', 'extra'));
