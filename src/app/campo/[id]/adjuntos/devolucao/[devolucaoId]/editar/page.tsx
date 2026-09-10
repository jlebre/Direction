import { createSessionServerClient } from '@/lib/supabase/session-server'
import { notFound } from 'next/navigation'
import type { CampoPublico } from '@/types/shared'
import type { Devolucao, Despesa } from '@/types/adjuntos'
import { getSignedPhotoUrl } from '@/lib/adjuntos/supabase-storage'
import EditarDevolucaoClient from './EditarDevolucaoClient'

export const dynamic = 'force-dynamic'

export default async function EditarDevolucaoPage({
  params,
}: {
  params: Promise<{ id: string; devolucaoId: string }>
}) {
  const { id, devolucaoId } = await params
  const supabase = await createSessionServerClient()

  const [{ data: campo }, { data: devolucao }, { data: faturas }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('devolucoes').select('*').eq('id', devolucaoId).eq('campo_id', id).single(),
    supabase
      .from('despesas')
      .select('id, numero_recibo, descricao, codigo_descricao, codigo, valor')
      .eq('campo_id', id)
      .eq('tipo', 'despesa')
      .eq('is_regularizacao_nif', false)
      .order('numero_recibo', { ascending: false }),
  ])

  if (!campo || !devolucao) notFound()

  const { pin, ...campoPublico } = campo
  const d = devolucao as Devolucao
  const existingPhotoUrl = d.foto_path ? await getSignedPhotoUrl(supabase, d.foto_path) : null

  return (
    <EditarDevolucaoClient
      campo={campoPublico as CampoPublico}
      hasPin={!!pin}
      devolucao={d}
      faturas={(faturas ?? []) as Despesa[]}
      existingPhotoUrl={existingPhotoUrl}
    />
  )
}
