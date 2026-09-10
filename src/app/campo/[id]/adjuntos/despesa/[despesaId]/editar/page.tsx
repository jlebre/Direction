import { notFound } from 'next/navigation'
import type { CampoPublico } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import { getSignedPhotoUrl } from '@/lib/adjuntos/supabase-storage'
import EditarDespesaClient from './EditarDespesaClient'
import { resolveActor, actorCanAccessCamp } from '@/lib/auth/actor'

export const dynamic = 'force-dynamic'

export default async function EditarDespesaPage({
  params,
}: {
  params: Promise<{ id: string; despesaId: string }>
}) {
  const { id, despesaId } = await params
  const actor = await resolveActor()
  if (actor.actorType === 'camp_access' && !actorCanAccessCamp(actor, id)) notFound()
  const supabase = actor.supabase
  const isCampAccess = actor.actorType === 'camp_access'

  const [{ data: campo }, { data: despesa }] = isCampAccess
    ? await Promise.all([
        supabase.rpc('camp_access_get_campo', { p_link_id: actor.linkId }).then((r) => ({ data: (r.data as unknown[])?.[0] ?? null })),
        supabase.rpc('camp_access_get_despesa', { p_link_id: actor.linkId, p_despesa_id: despesaId }).then((r) => ({ data: (r.data as unknown[])?.[0] ?? null })),
      ])
    : await Promise.all([
        supabase.from('campos').select('*').eq('id', id).single(),
        supabase.from('despesas').select('*').eq('id', despesaId).eq('campo_id', id).single(),
      ])

  if (!campo || !despesa) notFound()

  const { pin, ...campoPublico } = campo
  const d = despesa as Despesa
  const existingPhotoUrl = d.foto_path ? await getSignedPhotoUrl(supabase, d.foto_path) : null
  // Uma Camp Access Session já É a autorização — o gate de PIN da UI (gate
  // legacy, ver AUTHORIZATION.md) fica sempre desligado para ela, nunca
  // fricção dupla.
  const hasPin = isCampAccess ? false : !!pin

  return <EditarDespesaClient campo={campoPublico as CampoPublico} hasPin={hasPin} despesa={d} existingPhotoUrl={existingPhotoUrl} />
}
