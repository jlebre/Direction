-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2.3 (V2 Security & Auth) — camp_memberships + funções auxiliares de RLS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- camp_id referencia a tabela legacy `campos` (ainda não renomeada para
-- `camps` — essa é uma decisão da Fase 4/ERD.md, não desta fase de
-- segurança: "não fazer renames grandes nesta fase só por estética").
--
-- FORWARD:      este ficheiro.
-- ROLLBACK:     supabase/rollbacks/039_camp_memberships_rollback.sql
-- VERIFICATION: tests/security/ (2.3) + introspeção direta (pg_policy).
--
-- Idempotente. Ordem importa: a tabela tem de existir ANTES das funções SQL
-- que a referenciam (LANGUAGE sql valida a existência dos objetos referidos
-- já na criação, ao contrário de plpgsql).

-- ── camp_memberships ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS camp_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id     UUID NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('adjunto', 'field_viewer')),
  status      TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ
);

COMMENT ON TABLE camp_memberships IS
  'Fase 2.3 V2. Liga um utilizador (auth.users) a um campo (campos) com um '
  'role local. Substitui o PIN de campo partilhado como mecanismo de acesso.';

-- No máximo uma membership invited/active por (camp_id, user_id) em
-- simultâneo — uma revoked não conta, permite reconvite depois de revogação.
CREATE UNIQUE INDEX IF NOT EXISTS camp_memberships_unique_active
  ON camp_memberships (camp_id, user_id)
  WHERE status IN ('invited', 'active');

CREATE INDEX IF NOT EXISTS camp_memberships_user_idx ON camp_memberships (user_id);
CREATE INDEX IF NOT EXISTS camp_memberships_camp_idx ON camp_memberships (camp_id);

-- revoked_at acompanha automaticamente a transição para status='revoked' —
-- para nenhum caminho de escrita (admin UI, futura Server Action) se
-- esquecer de o preencher.
CREATE OR REPLACE FUNCTION public.set_camp_membership_revoked_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'revoked' AND (OLD.status IS DISTINCT FROM 'revoked') THEN
    NEW.revoked_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS camp_memberships_revoked_at ON camp_memberships;
CREATE TRIGGER camp_memberships_revoked_at
  BEFORE UPDATE ON camp_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_camp_membership_revoked_at();

ALTER TABLE camp_memberships ENABLE ROW LEVEL SECURITY;

-- ── Funções auxiliares de autorização ───────────────────────────────────────
-- SECURITY DEFINER é essencial aqui (não só convenção): sem isto, uma policy
-- em camp_memberships que chamasse has_camp_access() ao ler a própria tabela
-- camp_memberships entraria em recursão de RLS. Com SECURITY DEFINER, a
-- função lê camp_memberships/profiles sem re-avaliar RLS internamente,
-- enquanto a policy exterior (a que decide o que o UTILIZADOR vê) continua
-- a aplicar RLS normalmente. `SET search_path` fixo (nunca herdado de quem
-- chama) é a mitigação padrão contra search-path hijacking em SECURITY
-- DEFINER — todas as referências a tabelas abaixo são também explicitamente
-- schema-qualificadas (public.xxx) por defesa em profundidade.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role = 'admin' AND disabled_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_treasurer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role = 'treasurer' AND disabled_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role = 'viewer' AND disabled_at IS NULL
  );
$$;

-- Qualquer um dos três roles globais com acesso financeiro transversal
-- (admin/treasurer/viewer) — usado sempre que a distinção entre eles não
-- importa (ex.: "pode ler este campo").
CREATE OR REPLACE FUNCTION public.has_global_read()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin() OR public.is_treasurer() OR public.is_viewer();
$$;

-- Leitura de um campo específico: qualquer role global de leitura, OU
-- membership local ativa (adjunto ou field_viewer) e não expirada.
CREATE OR REPLACE FUNCTION public.has_camp_access(target_camp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.has_global_read()
    OR EXISTS (
      SELECT 1 FROM public.camp_memberships
      WHERE camp_id = target_camp_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
$$;

-- Escrita operacional num campo: admin/treasurer, OU membership local ativa
-- e não expirada com role 'adjunto' (field_viewer nunca escreve).
CREATE OR REPLACE FUNCTION public.can_edit_camp(target_camp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_admin() OR public.is_treasurer()
    OR EXISTS (
      SELECT 1 FROM public.camp_memberships
      WHERE camp_id = target_camp_id
        AND user_id = auth.uid()
        AND role = 'adjunto'
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
$$;

-- ── Policies de camp_memberships (agora que os helpers existem) ────────────
-- SELECT: o próprio vê as suas memberships; admin/treasurer/viewer veem tudo
-- (precisam de visibilidade transversal para gerir/relatar).
DROP POLICY IF EXISTS "camp_memberships_select" ON camp_memberships;
CREATE POLICY "camp_memberships_select" ON camp_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_global_read());

-- INSERT/UPDATE: só admin/treasurer podem convidar, alterar role ou revogar
-- (ver Gate A — "Admin/Treasurer -> adiciona email"). Ninguém se auto-atribui
-- uma membership.
DROP POLICY IF EXISTS "camp_memberships_write" ON camp_memberships;
CREATE POLICY "camp_memberships_write" ON camp_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_treasurer());

DROP POLICY IF EXISTS "camp_memberships_update" ON camp_memberships;
CREATE POLICY "camp_memberships_update" ON camp_memberships
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_treasurer())
  WITH CHECK (public.is_admin() OR public.is_treasurer());

-- Sem policy de DELETE — revogação é sempre soft (status='revoked'), nunca
-- apagar a linha (histórico de "quem teve acesso quando" preservado).

-- ── Alarga profiles (migration 038) agora que os helpers existem ───────────
-- admin/treasurer passam a ver todos os profiles (necessário para a UI
-- administrativa mínima: "ver utilizadores"). viewer NÃO — não precisa de
-- gerir utilizadores, só dados financeiros.
DROP POLICY IF EXISTS "profiles_select_admin_treasurer" ON profiles;
CREATE POLICY "profiles_select_admin_treasurer" ON profiles
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_treasurer());

-- Só admin pode alterar QUALQUER profile (incl. global_role de outra
-- pessoa) — é como global_role de outra pessoa alguma vez muda.
DROP POLICY IF EXISTS "profiles_admin_manage" ON profiles;
CREATE POLICY "profiles_admin_manage" ON profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
