-- Migration 024: garantir unicidade de numero_devolucao por campo
-- A unique index foi criada em 013_qr_devolucoes.sql.
-- Esta migration confirma e documenta a constraint (IF NOT EXISTS — idempotente).
-- O fix real é no client: inserir a row primeiro para "reservar" o numero,
-- e só depois fazer upload da foto com o numero confirmado.

CREATE UNIQUE INDEX IF NOT EXISTS devolucoes_numero_campo_idx
  ON devolucoes (campo_id, numero_devolucao);
