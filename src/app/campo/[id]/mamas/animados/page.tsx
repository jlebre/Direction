import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/mamas/Header'
import AnimadosClient from './AnimadosClient'
import type { Animado } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function AnimadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: animados }] = await Promise.all([
    supabase.from('campos').select('id, nome, seccao').eq('id', id).single(),
    supabase
      .from('animados')
      .select('*, restricoes:restricoes_alimentares(id, tipo), medicacoes:farmacia_medicacoes(id), contactos:contactos_emergencia(id)')
      .eq('campo_id', id)
      .order('nome'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header
        title={`Animados (${animados?.length ?? 0})`}
        backHref={`/campo/${id}/mamas`}
      />
      <AnimadosClient campoId={id} campoSeccao={campo.seccao} animadosIniciais={(animados ?? []) as Animado[]} />
    </>
  )
}
