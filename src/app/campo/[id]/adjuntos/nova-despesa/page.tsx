import { notFound } from 'next/navigation'
import NovaDespesaClient from './NovaDespesaClient'
import type { CampoPublico } from '@/types/shared'
import { resolveActor, actorCanAccessCamp } from '@/lib/auth/actor'

export const dynamic = 'force-dynamic'

export default async function NovaDespesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await resolveActor()
  if (actor.actorType === 'camp_access' && !actorCanAccessCamp(actor, id)) notFound()
  const supabase = actor.supabase
  const isCampAccess = actor.actorType === 'camp_access'

  const { data: campo } = isCampAccess
    ? { data: ((await supabase.rpc('camp_access_get_campo', { p_link_id: actor.linkId })).data as unknown[])?.[0] ?? null }
    : await supabase.from('campos').select('*').eq('id', id).single()

  if (!campo) notFound()
  const { pin, ...campoPublico } = campo
  const hasPin = isCampAccess ? false : !!pin
  return <NovaDespesaClient campo={campoPublico as CampoPublico} hasPin={hasPin} />
}
