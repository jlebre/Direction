-- Garante que restricoes_alimentares tem RLS ativado com policies para anon+authenticated.
-- A app usa anon key — policies só para 'authenticated' bloqueiam operações de escrita.
-- Idempotente.

ALTER TABLE restricoes_alimentares ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'restricoes_alimentares'
      AND policyname = 'Anyone can manage restricoes'
  ) THEN
    CREATE POLICY "Anyone can manage restricoes" ON restricoes_alimentares
      FOR ALL TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
