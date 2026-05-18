import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ReceitasGrid } from '@/components/mamas/receitas/ReceitasGrid'
import { Header } from '@/components/mamas/Header'
import type { Campo } from '@/types/shared'
import type { Receita } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function ReceitasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: receitas }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('receitas').select('*').order('nome'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Receitas" backHref={`/campo/${id}/mamas`} />
      <ReceitasGrid
        receitas={(receitas ?? []) as Receita[]}
        campo={null}
        campoId={id}
      />
    </>
  )
}
