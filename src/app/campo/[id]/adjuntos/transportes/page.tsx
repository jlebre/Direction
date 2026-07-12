import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Campo } from '@/types/shared'
import type { Transporte } from '@/types/transportes'
import { SLOTS_PADRAO_DEF } from '@/types/transportes'
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
      .order('created_at', { ascending: true }),
  ])

  if (!campo) notFound()

  let transportesFinal = (transportes ?? []) as Transporte[]

  // Criar slots padrão que ainda não existem para este campo
  const existingSlotKeys = new Set(
    transportesFinal
      .filter((t) => t.is_slot_padrao && t.slot_key)
      .map((t) => t.slot_key as string)
  )

  const slotsToCreate = SLOTS_PADRAO_DEF.filter((s) => !existingSlotKeys.has(s.slot_key))

  if (slotsToCreate.length > 0) {
    await supabase.from('transportes').insert(
      slotsToCreate.map((s) => ({
        campo_id: id,
        sentido: s.sentido,
        origem: s.origem,
        destino: s.destino,
        tipo_transporte: 'autocarro',
        estado: 'por_configurar',
        is_slot_padrao: true,
        slot_key: s.slot_key,
      }))
    )
    const { data: refetch } = await supabase
      .from('transportes')
      .select('*')
      .eq('campo_id', id)
      .order('created_at', { ascending: true })
    transportesFinal = (refetch ?? []) as Transporte[]
  }

  return (
    <TransportesClient
      campo={campo as Campo}
      transportesIniciais={transportesFinal}
    />
  )
}
