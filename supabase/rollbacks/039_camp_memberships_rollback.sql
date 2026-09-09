-- ROLLBACK de 039_camp_memberships.sql — NÃO aplicado automaticamente.
-- Referência para correr manualmente se necessário.
--
-- ATENÇÃO: isto remove as policies alargadas de `profiles` (admin/treasurer)
-- E as funções auxiliares is_admin()/is_treasurer()/etc. Confirmar que
-- nenhuma policy de uma migration POSTERIOR a esta (ex. RLS de despesas na
-- subfase 2.4) ainda depende destas funções antes de correr isto.

DROP POLICY IF EXISTS "profiles_admin_manage" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin_treasurer" ON profiles;

DROP POLICY IF EXISTS "camp_memberships_update" ON camp_memberships;
DROP POLICY IF EXISTS "camp_memberships_write" ON camp_memberships;
DROP POLICY IF EXISTS "camp_memberships_select" ON camp_memberships;

DROP FUNCTION IF EXISTS public.can_edit_camp(uuid);
DROP FUNCTION IF EXISTS public.has_camp_access(uuid);
DROP FUNCTION IF EXISTS public.has_global_read();
DROP FUNCTION IF EXISTS public.is_viewer();
DROP FUNCTION IF EXISTS public.is_treasurer();
DROP FUNCTION IF EXISTS public.is_admin();

DROP TRIGGER IF EXISTS camp_memberships_revoked_at ON camp_memberships;
DROP FUNCTION IF EXISTS public.set_camp_membership_revoked_at();

DROP TABLE IF EXISTS camp_memberships;
