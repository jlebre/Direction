import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { CampoPublico } from '@/types/shared'
import type { Despesa, RegularizacaoNif } from '@/types/adjuntos'
import RegularizarClient from './RegularizarClient'

export const dynamic = 'force-dynamic'

export default async function RegularizarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesas }, { data: regularizacoes }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('despesas')
      .select('*')
      .eq('campo_id', id)
      .eq('tipo', 'despesa')
      .eq('nif_confirmado', false)
      .eq('is_regularizacao_nif', false)
      .order('numero_recibo', { ascending: true }),
    supabase.from('regularizacoes_nif').select('*').eq('campo_id', id),
  ])

  if (!campo) notFound()

  const { pin, ...campoPublico } = campo
  return (
    <RegularizarClient
      campo={campoPublico as CampoPublico}
      hasPin={!!pin}
      faturasSemNIF={(despesas ?? []) as Despesa[]}
      regularizacoes={(regularizacoes ?? []) as RegularizacaoNif[]}
    />
  )
}
