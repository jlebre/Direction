-- Fase 1: tornar descrição opcional nas despesas
ALTER TABLE despesas ALTER COLUMN descricao DROP NOT NULL;
ALTER TABLE despesas ALTER COLUMN descricao SET DEFAULT NULL;
