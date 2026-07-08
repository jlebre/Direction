import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FarmaciaView } from '@/components/mamas/farmacia/FarmaciaView'
import { Header } from '@/components/mamas/Header'
import type { FarmaciaMedicacao, ContactoEmergencia } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function FarmaciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: medicacoes }, { data: contactos }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase
      .from('farmacia_medicacoes')
      .select('*')
      .eq('campo_id', id)
      .order('crianca_nome'),
    supabase
      .from('contactos_emergencia')
      .select('*')
      .eq('campo_id', id)
      .order('nome'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Farmácia" backHref={`/campo/${id}`} />
      <FarmaciaView
        campoId={id}
        medicacoesIniciais={(medicacoes ?? []) as FarmaciaMedicacao[]}
        contactosIniciais={(contactos ?? []) as ContactoEmergencia[]}
      />
    </>
  )
}
