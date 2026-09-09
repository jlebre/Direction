-- ROLLBACK de 040_profiles_email.sql — NÃO aplicado automaticamente.
--
-- Reverte handle_new_user() para a versão da migration 038 (sem email) e
-- remove a coluna. Confirmar que nenhuma UI/Server Action já lida em
-- profiles.email antes de correr isto.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER TABLE profiles DROP COLUMN IF EXISTS email;
