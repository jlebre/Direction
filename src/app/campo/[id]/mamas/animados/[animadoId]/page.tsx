import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/mamas/Header'
import AnimadoPerfilClient from './AnimadoPerfilClient'
import type { Animado, RestricaoAlimentar, FarmaciaMedicacao, ContactoEmergencia } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function AnimadoPerfilPage({ params }: { params: Promise<{ id: string; animadoId: string }> }) {
  const { id, animadoId } = await params
  const supabase = createClient()

  const [{ data: animado }, { data: restricoes }, { data: medicacoes }, { data: contactos }] = await Promise.all([
    supabase.from('animados').select('*').eq('id', animadoId).single(),
    supabase.from('restricoes_alimentares').select('*').eq('animado_id', animadoId),
    supabase.from('farmacia_medicacoes').select('*').eq('animado_id', animadoId),
    supabase.from('contactos_emergencia').select('*').eq('animado_id', animadoId),
  ])

  if (!animado) notFound()

  return (
    <>
      <Header title={animado.nome} backHref={`/campo/${id}/mamas/animados`} />
      <AnimadoPerfilClient
        campoId={id}
        animado={animado as Animado}
        restricoesIniciais={(restricoes ?? []) as RestricaoAlimentar[]}
        medicacoesIniciais={(medicacoes ?? []) as FarmaciaMedicacao[]}
        contactosIniciais={(contactos ?? []) as ContactoEmergencia[]}
      />
    </>
  )
}
