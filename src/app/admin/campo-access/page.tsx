import { createSessionServerClient } from '@/lib/supabase/session-server'
import Link from 'next/link'
import CampoAccessClient, { type LinkRow } from './CampoAccessClient'

export const dynamic = 'force-dynamic'

export default async function CampoAccessPage() {
  const supabase = await createSessionServerClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth.user) {
    return <NeedsLogin reason="Esta ferramenta precisa de uma sessão real (Email OTP)." />
  }
  const { data: profile } = await supabase.from('profiles').select('global_role').eq('id', auth.user.id).single()
  if (profile?.global_role !== 'admin' && profile?.global_role !== 'treasurer') {
    return <NeedsLogin reason="A conta com que iniciaste sessão não é Admin nem Treasurer." />
  }

  const [{ data: campos }, { data: links }] = await Promise.all([
    supabase.from('campos').select('id, nome, ano').order('nome'),
    supabase
      .from('camp_access_links')
      .select('id, camp_id, created_at, expires_at, revoked_at, last_used_at')
      .order('created_at', { ascending: false }),
  ])

  const rows: LinkRow[] = (campos ?? []).map((c) => {
    const campLinks = (links ?? []).filter((l) => l.camp_id === c.id)
    const active = campLinks.find((l) => !l.revoked_at) ?? null
    return {
      campoId: c.id as string,
      nome: c.nome as string,
      ano: c.ano as number | null,
      activeLink: active,
    }
  })

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[#36454F]">Links de acesso por campo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cada campo tem um Adjunto operacional. Gera um link único, revogável, para ele entrar
          directamente na área financeira do seu campo — sem conta, sem OTP, sem password.
        </p>
      </div>
      <CampoAccessClient rows={rows} />
    </div>
  )
}

function NeedsLogin({ reason }: { reason: string }) {
  return (
    <div className="max-w-lg mx-auto p-6 space-y-3">
      <h1 className="text-lg font-bold text-[#36454F]">Links de acesso por campo</h1>
      <p className="text-sm text-gray-600">{reason}</p>
      <Link href="/login?next=/admin/campo-access" className="inline-block text-sm text-[#2D5016] font-semibold underline">
        Iniciar sessão →
      </Link>
    </div>
  )
}
