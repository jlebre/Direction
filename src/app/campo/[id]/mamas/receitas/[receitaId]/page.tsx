import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/mamas/Header'
import { IngredientesTable } from '@/components/mamas/receitas/IngredientesTable'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
import type { Campo } from '@/types/shared'
import type { Receita, ReceitaIngrediente } from '@/types/mamas'
import { CATEGORIA_LABELS, CATEGORIA_CORES } from '@/types/mamas'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ReceitaDetailPage({
  params,
}: {
  params: Promise<{ id: string; receitaId: string }>
}) {
  const { id, receitaId } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: receita }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('receitas')
      .select('*, ingredientes:receita_ingredientes(*, ingrediente:ingredientes(*))')
      .eq('id', receitaId)
      .single(),
  ])

  if (!campo || !receita) notFound()

  const r = receita as Receita & { ingredientes: ReceitaIngrediente[] }
  const c = campo as Campo
  const corCat = CATEGORIA_CORES[r.categoria]

  return (
    <>
      <Header title={r.nome} backHref={`/campo/${id}/mamas/receitas`} />
      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn('border', corCat)}>{CATEGORIA_LABELS[r.categoria]}</Badge>
          {r.is_oficial && (
            <Badge className="bg-amber-50 text-amber-800 border-amber-300 gap-1">
              <Star className="h-3 w-3" fill="currentColor" />
              Livrinho da Mamã
            </Badge>
          )}
          {r.tags?.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">#{tag}</span>
          ))}
        </div>

        {r.descricao && (
          <p className="text-gray-600 text-sm">{r.descricao}</p>
        )}

        {r.ingredientes && r.ingredientes.length > 0 && (
          <div>
            <h2 className="font-bold text-[#36454F] mb-3">Ingredientes</h2>
            <IngredientesTable
              ingredientes={r.ingredientes.map((ri) => ({
                id: ri.id,
                quantidade_mosquitos: ri.quantidade_mosquitos ?? 0,
                quantidade_aranh_melgas: ri.quantidade_aranh_melgas ?? 0,
                quantidade_cam_trem: ri.quantidade_cam_trem ?? 0,
                unidade: ri.unidade,
                notas: ri.notas,
                ingrediente: ri.ingrediente ? { nome: ri.ingrediente.nome } : undefined,
              }))}
              seccao={(c.seccao ?? 'aranhicos') as import('@/types/shared').SeccaoTipo}
              totalPessoas={(c.num_animados ?? 0) + (c.num_animadores ?? 0)}
            />
          </div>
        )}

        {r.instrucoes && (
          <div>
            <h2 className="font-bold text-[#36454F] mb-2">Instruções</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{r.instrucoes}</p>
          </div>
        )}

        {r.dicas_campo && (
          <div className="bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-xl p-4">
            <p className="font-semibold text-[#2D5016] text-sm mb-1">Dica para o campo</p>
            <p className="text-sm text-gray-600">{r.dicas_campo}</p>
          </div>
        )}
      </div>
    </>
  )
}
