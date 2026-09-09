-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2 (compatibilidade/onboarding) — profiles.email denormalizado
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A migration 038 comentava explicitamente "não duplicar email se não for
-- necessário". Passou a ser necessário: a UI mínima de onboarding de
-- memberships (admin) precisa de mostrar QUEM tem acesso a cada campo, e sem
-- isto teria de usar `service_role` só para listar — mais superfície de
-- risco do que uma coluna denormalizada e claramente documentada como tal.
--
-- `email` é copiado de auth.users no momento da criação da conta (trigger) e
-- nunca é a fonte de verdade — se uma pessoa mudar de email no Supabase Auth
-- diretamente, esta coluna fica desatualizada até uma reconciliação futura
-- (aceitável nesta fase; não crítico para autorização, só para exibição).
--
-- FORWARD:      este ficheiro.
-- ROLLBACK:     supabase/rollbacks/040_profiles_email_rollback.sql
-- VERIFICATION: leitura direta de profiles.email depois de aplicar.
--
-- Idempotente.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN profiles.email IS
  'Denormalizado de auth.users.email no momento da criação da conta (ver '
  'handle_new_user()). Só para exibição na UI de admin — nunca usar para '
  'autorização (usar sempre auth.uid()/profiles.id).';

-- Backfill dos profiles já existentes.
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- handle_new_user() (migration 038) passa a preencher também profiles.email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;
