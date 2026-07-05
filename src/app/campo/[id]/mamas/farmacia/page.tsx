import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FarmaciaView } from '@/components/mamas/farmacia/FarmaciaView'
import { Header } from '@/components/mamas/Header'
import type { Animado, FarmaciaMedicacao, ContactoEmergencia } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function FarmaciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: animados }, { data: medicacoes }, { data: contactos }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase.from('animados').select('id, nome').eq('campo_id', id).order('nome'),
    supabase
      .from('farmacia_medicacoes')
      .select('*, animado:animados!inner(id, nome)')
      .eq('animados.campo_id', id)
      .order('animado_id'),
    supabase
      .from('contactos_emergencia')
      .select('*, animado:animados!inner(id, nome)')
      .eq('animados.campo_id', id)
      .order('animado_id'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Farmácia" backHref={`/campo/${id}`} />
      <FarmaciaView
        campoId={id}
        animados={(animados ?? []) as Animado[]}
        medicacoesIniciais={(medicacoes ?? []) as FarmaciaMedicacao[]}
        contactosIniciais={(contactos ?? []) as ContactoEmergencia[]}
      />
    </>
  )
}
