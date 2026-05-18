import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DefinicoesForm } from '@/components/mamas/definicoes/DefinicoesForm'
import { Header } from '@/components/mamas/Header'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function DefinicoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: campo } = await supabase.from('campos').select('*').eq('id', id).single()
  if (!campo) notFound()

  return (
    <>
      <Header title="Definições do Campo" backHref={`/campo/${id}/mamas`} />
      <DefinicoesForm campo={campo as Campo} />
    </>
  )
}
