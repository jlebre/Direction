import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/mamas/Header'
import GuiaClient from './GuiaClient'

export const dynamic = 'force-dynamic'

export default async function FarmaciaGuiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const { data: campo } = await supabase.from('campos').select('id, nome').eq('id', id).single()
  if (!campo) notFound()

  return (
    <>
      <Header title="Livrinho da Farmácia" backHref={`/campo/${id}/mamas/farmacia`} />
      <GuiaClient campoId={id} />
    </>
  )
}
