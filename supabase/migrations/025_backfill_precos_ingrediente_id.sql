-- 025_backfill_precos_ingrediente_id.sql
-- Preenche ingrediente_id nas entradas de preços existentes sem ligação,
-- fazendo match exacto por nome (case-insensitive, ignora espaços extra).
--
-- SEGURO: apenas UPDATE em rows com ingrediente_id IS NULL e não apagadas.
-- Idempotente: nova execução não afecta rows já ligadas.
-- Se existir mais de um ingrediente com o mesmo nome, usa o mais antigo.

DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE precos p
  SET ingrediente_id = (
    SELECT id
    FROM ingredientes i
    WHERE LOWER(TRIM(i.nome)) = LOWER(TRIM(p.produto))
    ORDER BY i.created_at
    LIMIT 1
  )
  WHERE p.ingrediente_id IS NULL
    AND p.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM ingredientes i
      WHERE LOWER(TRIM(i.nome)) = LOWER(TRIM(p.produto))
    );

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE 'Ligações preços→ingredientes criadas: %', rows_updated;
END $$;
