import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { CampoPublico } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import { getPhotoUrl } from '@/lib/adjuntos/supabase-storage'
import EditarDespesaClient from './EditarDespesaClient'

export const dynamic = 'force-dynamic'

export default async function EditarDespesaPage({
  params,
}: {
  params: Promise<{ id: string; despesaId: string }>
}) {
  const { id, despesaId } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesa }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('despesas').select('*').eq('id', despesaId).eq('campo_id', id).single(),
  ])

  if (!campo || !despesa) notFound()

  const { pin, ...campoPublico } = campo
  const d = despesa as Despesa
  const existingPhotoUrl = d.foto_path ? getPhotoUrl(d.foto_path) : null

  return <EditarDespesaClient campo={campoPublico as CampoPublico} hasPin={!!pin} despesa={d} existingPhotoUrl={existingPhotoUrl} />
}
