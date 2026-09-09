import { createSessionServerClient } from '@/lib/supabase/session-server'
import { MembershipsClient, type CampReadiness, type MembershipRow } from './MembershipsClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MembershipsPage() {
  const supabase = await createSessionServerClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth.user) {
    return (
      <NeedsLogin reason="Esta ferramenta precisa de uma sessão real (Email OTP) — o PIN legacy do /admin não chega para esta parte." />
    )
  }

  const { data: profile } = await supabase.from('profiles').select('global_role').eq('id', auth.user.id).single()
  if (profile?.global_role !== 'admin') {
    return <NeedsLogin reason="A conta com que iniciaste sessão não tem global_role='admin'." />
  }

  // Dados brutos — agregados em JS abaixo (11 campos, poucas centenas de
  // despesas/devoluções, sem necessidade de RPC/view só para isto).
  // Nota: camp_memberships.user_id e profiles.id referenciam ambos
  // auth.users(id), mas não há FK direta entre as duas tabelas — o
  // PostgREST não consegue "embed" profiles a partir de camp_memberships
  // (precisaria de uma FK camp_memberships -> profiles explícita). Por
  // isso duas queries + join em JS, em vez de um select embutido.
  const [{ data: campos }, { data: memberships }, { data: despesas }, { data: devolucoes }] = await Promise.all([
    supabase.from('campos').select('id, nome, ano, arquivado').order('nome'),
    supabase
      .from('camp_memberships')
      .select('id, camp_id, user_id, role, status, created_at, expires_at, revoked_at')
      .order('created_at', { ascending: false }),
    supabase.from('despesas').select('campo_id, created_at'),
    supabase.from('devolucoes').select('campo_id, created_at'),
  ])

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id as string))]
  const { data: profilesForMemberships } =
    userIds.length > 0
      ? await supabase.from('profiles').select('id, email, display_name').in('id', userIds)
      : { data: [] as { id: string; email: string | null; display_name: string | null }[] }
  const profileById = new Map((profilesForMemberships ?? []).map((p) => [p.id as string, p]))

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  const lastActivityByCampo = new Map<string, string>()
  const activity24hByCampo = new Map<string, number>()
  const activity7dByCampo = new Map<string, number>()

  for (const rows of [despesas ?? [], devolucoes ?? []]) {
    for (const r of rows as { campo_id: string; created_at: string }[]) {
      const t = new Date(r.created_at).getTime()
      const prev = lastActivityByCampo.get(r.campo_id)
      if (!prev || t > new Date(prev).getTime()) lastActivityByCampo.set(r.campo_id, r.created_at)
      if (now - t < DAY) activity24hByCampo.set(r.campo_id, (activity24hByCampo.get(r.campo_id) ?? 0) + 1)
      if (now - t < 7 * DAY) activity7dByCampo.set(r.campo_id, (activity7dByCampo.get(r.campo_id) ?? 0) + 1)
    }
  }

  const membershipRows: MembershipRow[] = (memberships ?? []).map((m) => {
    const profile = profileById.get(m.user_id as string)
    return {
      id: m.id as string,
      campId: m.camp_id as string,
      userId: m.user_id as string,
      role: m.role as 'adjunto' | 'field_viewer',
      status: m.status as 'invited' | 'active' | 'revoked',
      createdAt: m.created_at as string,
      expiresAt: m.expires_at as string | null,
      revokedAt: m.revoked_at as string | null,
      email: profile?.email ?? null,
      displayName: profile?.display_name ?? null,
    }
  })

  const readiness: CampReadiness[] = (campos ?? []).map((c) => {
    const campMemberships = membershipRows.filter((m) => m.campId === c.id)
    const activeEditors = campMemberships.filter((m) => m.role === 'adjunto' && m.status === 'active')
    const isExpired = (m: MembershipRow) => Boolean(m.expiresAt && new Date(m.expiresAt).getTime() < now)
    const activeNonExpiredEditors = activeEditors.filter((m) => !isExpired(m))
    return {
      campId: c.id as string,
      nome: c.nome as string,
      ano: c.ano as number | null,
      arquivado: Boolean(c.arquivado),
      totalMemberships: campMemberships.length,
      activeEditors: activeNonExpiredEditors.length,
      lastActivity: lastActivityByCampo.get(c.id as string) ?? null,
      activity24h: activity24hByCampo.get(c.id as string) ?? 0,
      activity7d: activity7dByCampo.get(c.id as string) ?? 0,
      readyForRls: activeNonExpiredEditors.length > 0 || Boolean(c.arquivado),
    }
  })

  return (
    <MembershipsClient
      readiness={readiness}
      memberships={membershipRows}
      campos={(campos ?? []).map((c) => ({ id: c.id as string, nome: c.nome as string }))}
    />
  )
}

function NeedsLogin({ reason }: { reason: string }) {
  return (
    <div className="max-w-lg mx-auto p-6 space-y-3">
      <h1 className="text-lg font-bold text-[#36454F]">Onboarding de utilizadores (V2)</h1>
      <p className="text-sm text-gray-600">{reason}</p>
      <Link href="/login?next=/admin/memberships" className="inline-block text-sm text-[#2D5016] font-semibold underline">
        Iniciar sessão →
      </Link>
    </div>
  )
}
