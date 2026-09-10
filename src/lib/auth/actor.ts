import type { SupabaseClient } from '@supabase/supabase-js'
import { createSessionServerClient } from '@/lib/supabase/session-server'
import { getCampAccessLinkIdFromCookie } from '@/lib/camp-access/session'

/**
 * FASE 2 — Camp Access Links (secção 10 do pedido): abstração única de
 * autorização, para nunca duplicar esta lógica por página/Server Action.
 *
 * Resolve, por esta ordem, em cada pedido:
 *   1. staff  — sessão Supabase Auth real (Admin/Treasurer/Viewer).
 *   2. camp_access — cookie de capacidade válido (nunca confia no cookie
 *      sozinho: `campId` vem sempre de `camp_access_camp_id()`, que
 *      revalida o link contra a BD — revogado/expirado devolve null aqui).
 *   3. anonymous — nem uma coisa nem outra (inclui a exceção legacy
 *      `legacy_anon_access`, que continua a ser avaliada pela RLS em si,
 *      não por este actor).
 */
export type Actor =
  | { actorType: 'staff'; userId: string; globalRole: 'admin' | 'treasurer' | 'viewer' | null; supabase: SupabaseClient }
  | { actorType: 'camp_access'; linkId: string; campId: string; supabase: SupabaseClient }
  | { actorType: 'anonymous'; supabase: SupabaseClient }

export async function resolveActor(): Promise<Actor> {
  const supabase = await createSessionServerClient()

  const { data: authData } = await supabase.auth.getUser()
  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', authData.user.id)
      .single()
    return {
      actorType: 'staff',
      userId: authData.user.id,
      globalRole: (profile?.global_role as 'admin' | 'treasurer' | 'viewer' | null) ?? null,
      supabase,
    }
  }

  const linkId = await getCampAccessLinkIdFromCookie()
  if (linkId) {
    const { data: campId, error } = await supabase.rpc('camp_access_camp_id', { p_link_id: linkId })
    if (!error && campId) {
      return { actorType: 'camp_access', linkId, campId: campId as string, supabase }
    }
  }

  return { actorType: 'anonymous', supabase }
}

/** true se o actor pode operar (ler/escrever) no campo indicado — staff com leitura/escrita global, ou camp_access do próprio campo. */
export function actorCanAccessCamp(actor: Actor, campId: string): boolean {
  if (actor.actorType === 'staff') return true // RLS decide o detalhe fino (read vs write) para staff
  if (actor.actorType === 'camp_access') return actor.campId === campId
  return false
}
