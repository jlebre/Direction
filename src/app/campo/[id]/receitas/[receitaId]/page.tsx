import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/mamas/Header'
import { ReceitaDetail } from '@/components/mamas/receitas/ReceitaDetail'
import type { Campo } from '@/types/shared'
import type { Receita, ReceitaIngrediente } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function ReceitaDetailPage({
  params,
}: {
  params: Promise<{ id: string; receitaId: string }>
}) {
  const { id, receitaId } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: receita }, { data: precosData }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('receitas')
      .select('*, ingredientes:receita_ingredientes(*, ingrediente:ingredientes(*))')
      .eq('id', receitaId)
      .is('deleted_at', null)
      .single(),
    supabase.from('precos').select('produto, preco'),
  ])

  if (!campo || !receita) notFound()

  const r = receita as Receita & { ingredientes: ReceitaIngrediente[] }
  const c = campo as Campo

  return (
    <>
      <Header title={r.nome} backHref={`/campo/${id}/receitas`} />
      <ReceitaDetail
        receita={r}
        campo={c}
        precosReferencia={(precosData ?? []) as { produto: string; preco: number | null }[]}
      />
    </>
  )
}
