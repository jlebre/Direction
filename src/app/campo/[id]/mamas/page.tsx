import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { UtensilsCrossed, BookOpen } from 'lucide-react'
import type { Campo } from '@/types/shared'
import { getNumDias } from '@/types/shared'
import type { EmentaItem, RestricaoAlimentar } from '@/types/mamas'
import { EmentaCalendario } from '@/components/mamas/ementa/EmentaCalendario'
import { ExportarPlanoButton } from './ExportarPlanoButton'

export const dynamic = 'force-dynamic'

export default async function MamasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: ementa }, { data: receitas }, { data: animados }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('ementa').select('*, receita:receitas(id, nome, categoria, tags)').eq('campo_id', id),
    supabase.from('receitas').select('id, nome, categoria, tags, is_oficial').order('nome'),
    supabase
      .from('animados')
      .select('id, nome, restricoes:restricoes_alimentares(*, animado:animados(id, nome))')
      .eq('campo_id', id),
  ])

  if (!campo) notFound()

  const c = campo as Campo
  const primeiroNome = c.mama?.split(' ')[0] || 'Mamã'

  const restricoes: RestricaoAlimentar[] = (animados ?? []).flatMap(
    (a: { restricoes?: RestricaoAlimentar[] }) => a.restricoes ?? []
  )

  const numDias = getNumDias(c.seccao)
  const diasList = [-2, -1, ...Array.from({ length: numDias }, (_, i) => i + 1)]

  return (
    <div className="flex flex-col h-screen">
      {/* Header verde */}
      <div className="bg-[#2D5016] text-white px-4 pt-8 pb-5 shrink-0">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Link href={`/campo/${id}`} className="text-green-200 text-sm">
              ← {c.nome}
            </Link>
            <ExportarPlanoButton campo={c} diasList={diasList} />
          </div>
          <h1 className="text-2xl font-bold">Olá, {primeiroNome}</h1>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Link
              href={`/campo/${id}/mamas/receitas`}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Receitas
            </Link>
            <Link
              href={`/campo/${id}/mamas/conselhos`}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Conselhos
            </Link>
          </div>
        </div>
      </div>

      {/* Plano de Refeições */}
      <div className="flex-1 min-h-0">
        <EmentaCalendario
          campo={c}
          ementaInicial={(ementa ?? []) as EmentaItem[]}
          receitas={receitas ?? []}
          restricoes={restricoes}
        />
      </div>
    </div>
  )
}
