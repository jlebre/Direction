-- 026_ementa_num_animados_animadores.sql
-- Adiciona colunas para separar animados e animadores por slot de ementa.
-- Permite que o preset "Outro" guarde a divisão exacta, sem perder retrocompatibilidade.
-- SEGURO: ADD COLUMN nullable — sem DROP, sem DEFAULT destrutivo.

ALTER TABLE ementa ADD COLUMN IF NOT EXISTS num_animados INTEGER;
ALTER TABLE ementa ADD COLUMN IF NOT EXISTS num_animadores INTEGER;
