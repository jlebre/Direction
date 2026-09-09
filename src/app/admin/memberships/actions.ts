'use server'

import { createSessionServerClient } from '@/lib/supabase/session-server'
import { createAdminClient } from '@/lib/supabase/admin-server'
import { revalidatePath } from 'next/cache'

/**
 * FASE 2 (onboarding real) — Server Actions da ferramenta mínima de
 * migração de utilizadores. Todas verificam explicitamente `is_admin()` no
 * servidor, além da própria RLS (defesa em profundidade, mesma filosofia do
 * resto da Fase 2 — nunca confiar só na UI/só na RLS).
 */

async function assertIsAdmin() {
  const supabase = await createSessionServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sem sessão — inicia sessão em /login.')

  const { data: profile } = await supabase.from('profiles').select('global_role').eq('id', auth.user.id).single()
  if (profile?.global_role !== 'admin') {
    throw new Error('Só administradores podem gerir memberships.')
  }
  return supabase
}

export interface InviteResult {
  error?: string
  ok?: boolean
  createdNewAccount?: boolean
}

export async function inviteUserToCamp(formData: FormData): Promise<InviteResult> {
  let supabase
  try {
    supabase = await assertIsAdmin()
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro de autorização.' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const campId = String(formData.get('camp_id') ?? '').trim()
  const role = String(formData.get('role') ?? '').trim()

  if (!email || !email.includes('@')) return { error: 'Email inválido.' }
  if (!campId) return { error: 'Escolhe um campo.' }
  if (role !== 'adjunto' && role !== 'field_viewer') return { error: 'Role inválido.' }

  // 1. Já existe uma conta com este email? (lê profiles.email — sem
  //    precisar de service_role para esta parte de leitura.)
  const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()

  let userId = existingProfile?.id as string | undefined
  let createdNewAccount = false

  if (!userId) {
    // 2. Conta nova — aqui sim precisamos do Admin API (service_role).
    let admin
    try {
      admin = createAdminClient()
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'service_role não configurada.' }
    }
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true, // não precisa de confirmar por link — entra por Email OTP diretamente
    })
    if (createError || !created.user) {
      return { error: `Não foi possível criar a conta: ${createError?.message ?? 'erro desconhecido'}` }
    }
    userId = created.user.id
    createdNewAccount = true
  }

  // 3. camp_membership — 'active' se a conta já existia (a pessoa já
  //    consegue autenticar-se hoje); 'invited' se é mesmo nova (só fica
  //    'active' depois do primeiro login — a decidir numa fase seguinte;
  //    por agora um admin pode simplesmente marcar como active manualmente
  //    se preferir, via updateMembershipStatus).
  const { error: upsertError } = await supabase.from('camp_memberships').upsert(
    {
      camp_id: campId,
      user_id: userId,
      role,
      status: createdNewAccount ? 'invited' : 'active',
    },
    { onConflict: 'camp_id,user_id' }
  )

  if (upsertError) {
    return { error: `Conta preparada, mas falhou a associar ao campo: ${upsertError.message}` }
  }

  revalidatePath('/admin/memberships')
  return { ok: true, createdNewAccount }
}

export async function revokeMembership(membershipId: string): Promise<{ error?: string }> {
  try {
    const supabase = await assertIsAdmin()
    const { error } = await supabase
      .from('camp_memberships')
      .update({ status: 'revoked' })
      .eq('id', membershipId)
    if (error) return { error: error.message }
    revalidatePath('/admin/memberships')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro.' }
  }
}

export async function activateMembership(membershipId: string): Promise<{ error?: string }> {
  try {
    const supabase = await assertIsAdmin()
    const { error } = await supabase
      .from('camp_memberships')
      .update({ status: 'active' })
      .eq('id', membershipId)
    if (error) return { error: error.message }
    revalidatePath('/admin/memberships')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro.' }
  }
}

export async function setMembershipExpiry(membershipId: string, expiresAt: string | null): Promise<{ error?: string }> {
  try {
    const supabase = await assertIsAdmin()
    const { error } = await supabase
      .from('camp_memberships')
      .update({ expires_at: expiresAt })
      .eq('id', membershipId)
    if (error) return { error: error.message }
    revalidatePath('/admin/memberships')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro.' }
  }
}
