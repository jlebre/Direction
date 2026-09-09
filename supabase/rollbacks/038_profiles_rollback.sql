-- ROLLBACK de 038_profiles.sql — NÃO aplicado automaticamente pelo
-- `supabase db push`. Ficheiro de referência, para correr manualmente
-- (`supabase db query < este_ficheiro.sql` ou equivalente) só se necessário.
--
-- SEGURO de correr enquanto nada mais depender de `profiles`
-- (camp_memberships/RLS de outras tabelas ainda não referenciam esta tabela
-- nesta fase — confirmar isso antes de correr, se for aplicado mais tarde).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS update_profiles_updated_at();
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP TABLE IF EXISTS profiles;
