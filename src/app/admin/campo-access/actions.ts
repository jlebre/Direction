'use server'

/**
 * FASE 2 — Camp Access Links: gestão (secções 15-16 do pedido).
 * Só Admin/Treasurer — reforçado aqui E dentro das RPCs SECURITY DEFINER
 * (camp_access_create_link/revoke_link, migration 045), nunca só num sítio.
 */
import { revalidatePath } from 'next/cache'
import { createSessionServerClient } from '@/lib/supabase/session-server'
import { generateToken, hashToken, buildAccessLinkUrl } from '@/lib/camp-access/token'

async function requireStaffManager() {
  const supabase = await createSessionServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Sem sessão.' as const, supabase: null }
  const { data: profile } = await supabase.from('profiles').select('global_role').eq('id', auth.user.id).single()
  if (profile?.global_role !== 'admin' && profile?.global_role !== 'treasurer') {
    return { error: 'Sem permissão — só Admin/Treasurer gerem links de acesso.' as const, supabase: null }
  }
  return { error: null, supabase }
}

export interface GenerateLinkResult {
  error?: string
  url?: string
}

/** Gera (ou regenera — revoga o anterior automaticamente) um link para o campo. Devolve o URL em claro UMA VEZ. */
export async function generateCampAccessLink(campoId: string): Promise<GenerateLinkResult> {
  const { error: authError, supabase } = await requireStaffManager()
  if (authError || !supabase) return { error: authError ?? 'Sem permissão.' }

  const token = generateToken()
  const tokenHash = hashToken(token)
  const { error } = await supabase.rpc('camp_access_create_link', {
    p_camp_id: campoId,
    p_token_hash: tokenHash,
    p_expires_at: null,
  })
  if (error) return { error: error.message }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://direction-camtil.vercel.app'
  revalidatePath('/admin/campo-access')
  return { url: buildAccessLinkUrl(baseUrl, token) }
}

export async function revokeCampAccessLink(linkId: string): Promise<{ error?: string }> {
  const { error: authError, supabase } = await requireStaffManager()
  if (authError || !supabase) return { error: authError ?? 'Sem permissão.' }

  const { error } = await supabase.rpc('camp_access_revoke_link', { p_link_id: linkId })
  if (error) return { error: error.message }
  revalidatePath('/admin/campo-access')
  return {}
}
