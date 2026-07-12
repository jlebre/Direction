import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RestricoesList } from '@/components/mamas/restricoes/RestricoesList'
import { Header } from '@/components/mamas/Header'
import type { RestricaoAlimentar } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function RestricoesFarmaciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: restricoes }, { data: ingredientes }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase
      .from('restricoes_alimentares')
      .select('*, ingredientes_linked:restricao_ingredientes(ingrediente_id, ingrediente:ingredientes(id, nome))')
      .eq('campo_id', id)
      .order('crianca_nome'),
    supabase.from('ingredientes').select('id, nome').order('nome'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Restrições Alimentares" backHref={`/campo/${id}`} />
      <RestricoesList
        campoId={id}
        restricoesIniciais={(restricoes ?? []) as RestricaoAlimentar[]}
        ingredientes={(ingredientes ?? []) as { id: string; nome: string }[]}
      />
    </>
  )
}
