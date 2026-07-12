import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { UtensilsCrossed, BookOpen } from 'lucide-react'
import type { Campo } from '@/types/shared'
import { getNumDias, ESCALAO_COR } from '@/types/shared'
import type { EmentaItem, CampoDia, RestricaoAlimentar } from '@/types/mamas'
import { EmentaCalendario } from '@/components/mamas/ementa/EmentaCalendario'
import { ExportarPlanoButton } from './ExportarPlanoButton'

export const dynamic = 'force-dynamic'

export default async function MamasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: ementa }, { data: receitas }, { data: restricoesData }, { data: campoDiasData }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('ementa').select(`
      *,
      receita:receitas(
        id, nome, categoria, tags,
        receita_ingredientes(ingrediente_id, ingrediente:ingredientes(id, nome))
      ),
      versao:receita_versoes(id, nome_versao, is_default)
    `).eq('campo_id', id),
    supabase.from('receitas').select('id, nome, categoria, tags, is_oficial').is('deleted_at', null).order('nome'),
    supabase.from('restricoes_alimentares')
      .select('*, ingredientes_linked:restricao_ingredientes(ingrediente_id, ingrediente:ingredientes(id, nome))')
      .eq('campo_id', id),
    supabase.from('campo_dias').select('id, campo_id, ordem, nome, data, tipo, ativo').eq('campo_id', id).eq('ativo', true).order('ordem'),
  ])

  if (!campo) notFound()

  const c = campo as Campo
  const cor = ESCALAO_COR[c.escalao] ?? { bg: '#2D5016', text: '#1a3009', light: '#E7F3DD', border: '#86efac' }
  const primeiroNome = c.mama?.split(' ')[0] || 'Mamã'

  const restricoes: RestricaoAlimentar[] = (restricoesData ?? []) as RestricaoAlimentar[]

  const numDias = getNumDias(c.seccao)
  const campoDiasActive = (campoDiasData ?? []) as CampoDia[]
  const diasList: number[] = campoDiasActive.length > 0
    ? campoDiasActive.filter((d) => d.ativo).sort((a, b) => a.ordem - b.ordem).map((d) => d.ordem)
    : [-2, -1, ...Array.from({ length: numDias }, (_, i) => i + 1)]

  return (
    <div className="flex flex-col h-screen">
      {/* Header — cor do escalão */}
      <div className="text-white px-4 pt-8 pb-5 shrink-0" style={{ backgroundColor: cor.bg }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Link href={`/campo/${id}`} className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              ← {c.nome}
            </Link>
            <ExportarPlanoButton campo={c} diasList={diasList} campoDias={campoDiasActive} />
          </div>
          <h1 className="text-2xl font-bold">Olá, {primeiroNome}</h1>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Link
              href={`/campo/${id}/receitas`}
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
            <Link
              href={`/campo/${id}/mamas/orcamento`}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors"
            >
              Orçamento
            </Link>
            <Link
              href={`/campo/${id}/mamas/lista`}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors"
            >
              Compras
            </Link>
            <Link
              href={`/campo/${id}/mamas/embalagens`}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors"
            >
              Embalagens
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
          corEscalao={cor}
          campoDiasInicial={(campoDiasData ?? []) as CampoDia[]}
        />
      </div>
    </div>
  )
}
