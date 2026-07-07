-- Migration 011: adiciona tipo_linha e categoria_linha a despesa_linhas
-- IMPACTO: nenhum — colunas novas com DEFAULT/NULL
-- Linhas existentes ficam com tipo_linha = 'produto', categoria_linha = NULL

ALTER TABLE despesa_linhas
  ADD COLUMN IF NOT EXISTS tipo_linha     TEXT DEFAULT 'produto',
  ADD COLUMN IF NOT EXISTS categoria_linha TEXT;
