-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2.2 (V2 Security & Auth) — identidade real por pessoa via Supabase Auth
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `profiles` estende `auth.users` (1:1, mesma PK). `global_role` é a fonte de
-- verdade para autorização a nível global (admin/treasurer/viewer) — NUNCA
-- confiar em `auth.users.raw_user_meta_data`/`user_metadata`, que é editável
-- pelo próprio utilizador via `supabase.auth.updateUser()`.
--
-- RLS restritiva desde o início (ao contrário do padrão "public_all" usado em
-- todas as tabelas legacy — ver auditoria técnica, achado CRITICAL): aqui só
-- o próprio utilizador vê/atualiza a sua linha, e mesmo assim NUNCA consegue
-- alterar `global_role` (WITH CHECK reafirma o valor atual via subquery).
-- Leitura alargada a admin/treasurer fica para a migration 039, depois de
-- `has_camp_access()`/`is_admin()` existirem — mantém cada migration pequena
-- e testável isoladamente, como pedido.
--
-- FORWARD:     este ficheiro.
-- ROLLBACK:    ver 038_profiles_rollback.sql (não aplicado automaticamente —
--              guardado só como referência documentada, nunca correr sem
--              confirmar que nenhum utilizador real já depende disto).
-- VERIFICATION: ver tests/security/ (2.2) — confirmar que um utilizador
--              autenticado só vê/edita a própria linha, e que anon não vê
--              nenhuma.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  global_role   TEXT CHECK (global_role IN ('admin', 'treasurer', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at   TIMESTAMPTZ
);

COMMENT ON TABLE profiles IS
  'Fase 2.2 V2. Identidade por utilizador (estende auth.users). global_role é '
  'a única fonte de verdade de autorização global — nunca confiar em '
  'auth.users.raw_user_meta_data, que o próprio utilizador pode editar.';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- O próprio utilizador vê a sua linha. Sem policy nenhuma para outros roles
-- ainda (ver nota acima) — anon e qualquer outro utilizador autenticado não
-- veem nada aqui até a migration 039.
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- O próprio utilizador pode atualizar display_name (e só isso, na prática —
-- RLS não filtra colunas, mas o WITH CHECK abaixo impede qualquer UPDATE que
-- mude global_role, comparando sempre com o valor já guardado).
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND global_role IS NOT DISTINCT FROM (
      SELECT p.global_role FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Sem policy de INSERT/DELETE para `authenticated` — profiles só é criado
-- pelo trigger abaixo (na criação da conta) e só apagado em cascata quando
-- auth.users é apagado (nunca diretamente).

-- updated_at automático.
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();

-- Cria automaticamente uma linha profiles quando uma conta Supabase Auth é
-- criada (padrão oficial Supabase). SECURITY DEFINER é necessário porque o
-- INSERT em auth.users corre com o role do serviço GoTrue, não com o role do
-- utilizador — sem isto, o INSERT em public.profiles falharia por RLS.
-- `SET search_path = public, pg_temp` fixa o search_path explicitamente
-- (mitigação standard contra search-path hijacking em funções
-- SECURITY DEFINER — nunca deixar herdar o search_path de quem chama).
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
