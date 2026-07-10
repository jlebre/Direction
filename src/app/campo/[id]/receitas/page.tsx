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
    supabase.from('receita_ingredientes').select('receita_id, ingrediente_id, ingrediente:ingredientes(nome)'),
    supabase.from('precos').select('produto, preco, ingrediente_id').is('deleted_at', null),
  ])

  if (!campo) notFound()

  // Computa mapa receita_id → nº ingredientes sem preço de referência (FK-first)
  const alertasPreco: Record<string, number> = {}
  if (riData && precosData) {
    type PrecoBadge = { produto: string; preco: number | null; ingrediente_id?: string | null }
    type RiRaw = { receita_id: string; ingrediente_id: string; ingrediente: { nome: string }[] | { nome: string } | null }
    const precos = precosData as PrecoBadge[]
    for (const ri of riData as unknown as RiRaw[]) {
      const ing = ri.ingrediente
      const nome = Array.isArray(ing) ? ing[0]?.nome : ing?.nome
      if (!nome) continue

      // 1. Verificar por FK
      const porFK = precos.filter((p) => p.ingrediente_id && p.ingrediente_id === ri.ingrediente_id)
      if (porFK.length > 0) {
        if (!porFK.some((p) => p.preco != null)) {
          alertasPreco[ri.receita_id] = (alertasPreco[ri.receita_id] ?? 0) + 1
        }
        continue
      }

      // 2. Fallback: nome exato
      const nLower = nome.toLowerCase().trim()
      const temPreco = precos.some((p) => p.produto.toLowerCase().trim() === nLower && p.preco != null)
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
