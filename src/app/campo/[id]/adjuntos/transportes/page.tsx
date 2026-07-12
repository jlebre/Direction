import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Campo } from '@/types/shared'
import type { Transporte } from '@/types/transportes'
import { TransportesClient } from '@/components/adjuntos/TransportesClient'

export const dynamic = 'force-dynamic'

export default async function TransportesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: transportes }] = await Promise.all([
    supabase.from('campos').select('id, nome, escalao').eq('id', id).single(),
    supabase
      .from('transportes')
      .select('*')
      .eq('campo_id', id)
      .order('data', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])

  if (!campo) notFound()

  return (
    <TransportesClient
      campo={campo as Campo}
      transportesIniciais={(transportes ?? []) as Transporte[]}
    />
  )
}
