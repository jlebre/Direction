import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { CampoPublico } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import NovaDevolucaoClient from './NovaDevolucaoClient'

export const dynamic = 'force-dynamic'

export default async function NovaDevolucaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: faturas }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('despesas')
      .select('id, numero_recibo, descricao, codigo, codigo_descricao, valor')
      .eq('campo_id', id)
      .eq('tipo', 'despesa')
      .eq('is_regularizacao_nif', false)
      .order('numero_recibo', { ascending: false }),
  ])

  if (!campo) notFound()

  const { pin, ...campoPublico } = campo
  void pin

  return (
    <NovaDevolucaoClient
      campo={campoPublico as CampoPublico}
      faturas={(faturas ?? []) as Despesa[]}
    />
  )
}
