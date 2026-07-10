import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ReceitasGrid } from '@/components/mamas/receitas/ReceitasGrid'
import { Header } from '@/components/mamas/Header'
import type { Receita } from '@/types/mamas'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function ReceitasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: receitas }, { data: riData }, { data: precosData }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('receitas').select('*').is('deleted_at', null).order('nome'),
    supabase.from('receita_ingredientes').select('receita_id, ingrediente:ingredientes(nome)'),
    supabase.from('precos').select('produto, preco').is('deleted_at', null),
  ])

  if (!campo) notFound()

  // Computa mapa receita_id → nº ingredientes sem preço de referência
  const alertasPreco: Record<string, number> = {}
  if (riData && precosData) {
    const precosLower = (precosData as { produto: string; preco: number | null }[]).map(
      (p) => p.produto.toLowerCase().trim()
    )
    type RiRaw = { receita_id: string; ingrediente: { nome: string }[] | { nome: string } | null }
    for (const ri of riData as unknown as RiRaw[]) {
      const ing = ri.ingrediente
      const nome = Array.isArray(ing) ? ing[0]?.nome : ing?.nome
      if (!nome) continue
      const nl = nome.toLowerCase().trim()
      const temPreco = precosLower.some((p) => p === nl || p.includes(nl) || nl.includes(p))
      if (!temPreco) {
        alertasPreco[ri.receita_id] = (alertasPreco[ri.receita_id] ?? 0) + 1
      }
    }
  }

  return (
    <>
      <Header title="Receitas" backHref={`/campo/${id}`} />
      <ReceitasGrid
        receitas={(receitas ?? []) as Receita[]}
        campo={campo as Campo}
        campoId={id}
        alertasPreco={alertasPreco}
      />
    </>
  )
}
