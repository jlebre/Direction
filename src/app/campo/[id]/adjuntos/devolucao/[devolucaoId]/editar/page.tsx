import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { CampoPublico } from '@/types/shared'
import type { Devolucao, Despesa } from '@/types/adjuntos'
import EditarDevolucaoClient from './EditarDevolucaoClient'

export const dynamic = 'force-dynamic'

export default async function EditarDevolucaoPage({
  params,
}: {
  params: Promise<{ id: string; devolucaoId: string }>
}) {
  const { id, devolucaoId } = await params
  const supabase = createClient()

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

  return (
    <EditarDevolucaoClient
      campo={campoPublico as CampoPublico}
      hasPin={!!pin}
      devolucao={devolucao as Devolucao}
      faturas={(faturas ?? []) as Despesa[]}
    />
  )
}
