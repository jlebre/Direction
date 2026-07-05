import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RestricoesList } from '@/components/mamas/restricoes/RestricoesList'
import { Header } from '@/components/mamas/Header'
import type { Animado, RestricaoAlimentar } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function RestricoesFarmaciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: animados }, { data: restricoes }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase.from('animados').select('id, nome').eq('campo_id', id).order('nome'),
    supabase
      .from('restricoes_alimentares')
      .select('*, animado:animados!inner(id, nome)')
      .eq('animados.campo_id', id)
      .order('animado_id'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Restrições Alimentares" backHref={`/campo/${id}`} />
      <RestricoesList
        animados={(animados ?? []) as Animado[]}
        restricoesIniciais={(restricoes ?? []) as RestricaoAlimentar[]}
      />
    </>
  )
}
