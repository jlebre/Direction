-- Migration 015: corrigir RLS de tomas_medicacao
-- A policy criada em 014 só permite 'authenticated', mas a app usa anon key.
-- Esta migration recria a policy consistente com o resto do projeto (anon + authenticated).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tomas_medicacao' AND policyname = 'Authenticated users manage tomas'
  ) THEN
    DROP POLICY "Authenticated users manage tomas" ON tomas_medicacao;
  END IF;
END $$;

CREATE POLICY "Anyone can manage tomas" ON tomas_medicacao
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
