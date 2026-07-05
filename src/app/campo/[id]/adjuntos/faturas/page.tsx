import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Campo } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import FaturasClient from './FaturasClient'

export const dynamic = 'force-dynamic'

export default async function FaturasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesas }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('despesas')
      .select('*')
      .eq('campo_id', id)
      .eq('tipo', 'despesa')
      .order('numero_recibo', { ascending: false }),
  ])

  if (!campo) notFound()

  return (
    <FaturasClient
      campo={campo as Campo}
      despesas={(despesas ?? []) as Despesa[]}
    />
  )
}
