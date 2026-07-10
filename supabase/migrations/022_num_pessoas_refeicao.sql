-- Migration 022: num_pessoas por refeição
-- Adiciona coluna num_pessoas à tabela ementa (override do total de campo)
-- Permite definir por slot (dia+refeição) quantas pessoas aquela refeição serve.
-- NULL = usar o total padrão do campo (num_animados + num_animadores)

ALTER TABLE ementa ADD COLUMN IF NOT EXISTS num_pessoas INTEGER;
