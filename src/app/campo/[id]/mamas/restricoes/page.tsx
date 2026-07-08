import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RestricoesList } from '@/components/mamas/restricoes/RestricoesList'
import { Header } from '@/components/mamas/Header'
import type { RestricaoAlimentar } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function RestricoesFarmaciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: restricoes }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase
      .from('restricoes_alimentares')
      .select('*')
      .eq('campo_id', id)
      .order('crianca_nome'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Restrições Alimentares" backHref={`/campo/${id}`} />
      <RestricoesList
        campoId={id}
        restricoesIniciais={(restricoes ?? []) as RestricaoAlimentar[]}
      />
    </>
  )
}
