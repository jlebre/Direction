-- Migration 016: garantir unicidade de numero_recibo por campo
-- Evita duplicados quando dois adjuntos registam despesas simultaneamente.

-- Verificar duplicados existentes antes de criar constraint
-- (se existirem, a migration falha com erro informativo)
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT campo_id, numero_recibo
    FROM despesas
    WHERE numero_recibo IS NOT NULL
    GROUP BY campo_id, numero_recibo
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Existem % pares (campo_id, numero_recibo) duplicados. Corrigir antes de adicionar constraint.', dup_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS despesas_campo_numero_recibo_unique
  ON despesas (campo_id, numero_recibo)
  WHERE numero_recibo IS NOT NULL;
