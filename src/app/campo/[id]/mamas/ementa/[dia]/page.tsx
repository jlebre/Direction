import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/mamas/Header'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { Campo } from '@/types/shared'
import type { EmentaItem, RestricaoAlimentar } from '@/types/mamas'
import { REFEICAO_LABELS, CATEGORIA_CORES, CATEGORIA_LABELS } from '@/types/mamas'
import { getDiaLabel, getNumDias } from '@/types/shared'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const REFEICOES = ['pequeno_almoco', 'almoco', 'lanche', 'jantar', 'ceia'] as const

export default async function EmentaDiaPage({
  params,
}: {
  params: Promise<{ id: string; dia: string }>
}) {
  const { id, dia: diaStr } = await params
  const dia = parseInt(diaStr)
  const supabase = createClient()

  const [{ data: campo }, { data: slots }, { data: animados }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('ementa')
      .select('*, receita:receitas(id, nome, categoria, tags, receita_ingredientes(ingrediente:ingredientes(nome)))')
      .eq('campo_id', id)
      .eq('dia', dia),
    supabase
      .from('animados')
      .select('id, nome, restricoes:restricoes_alimentares(*)')
      .eq('campo_id', id),
  ])

  if (!campo) notFound()

  const c = campo as Campo
  const numDias = getNumDias(c.seccao)
  const diasValidos = [-2, -1, ...Array.from({ length: numDias }, (_, i) => i + 1)]
  if (!diasValidos.includes(dia)) notFound()

  const restricoes: RestricaoAlimentar[] = (animados ?? []).flatMap(
    (a: { restricoes?: RestricaoAlimentar[] }) => a.restricoes ?? []
  )

  function getSlot(refeicao: string): EmentaItem | undefined {
    return (slots ?? []).find((s: EmentaItem) => s.refeicao === refeicao) as EmentaItem | undefined
  }

  function getAlertas(slot: EmentaItem): { animadoNome: string; descricao: string }[] {
    if (!slot?.receita) return []
    const alertas: { animadoNome: string; descricao: string }[] = []
    const ingredientesReceita: string[] = (slot.receita as unknown as {
      receita_ingredientes?: { ingrediente?: { nome: string } }[]
    })?.receita_ingredientes?.map((ri) => ri.ingrediente?.nome?.toLowerCase() ?? '') ?? []

    restricoes.forEach((r) => {
      const proibidos = r.ingredientes_proibidos ?? []
      if (proibidos.length === 0) return
      const match = proibidos.some((p) => ingredientesReceita.some((i) => i.includes(p.toLowerCase())))
      if (match) {
        const animadoNome = animados?.find((a: { id: string; nome: string }) => a.id === r.animado_id)?.nome ?? 'Animado'
        alertas.push({ animadoNome, descricao: r.descricao })
      }
    })
    return alertas
  }

  const diaIndex = diasValidos.indexOf(dia)
  const diaAnterior = diaIndex > 0 ? diasValidos[diaIndex - 1] : null
  const diaProximo = diaIndex < diasValidos.length - 1 ? diasValidos[diaIndex + 1] : null

  return (
    <>
      <Header
        title={getDiaLabel(dia)}
        backHref={`/campo/${id}/mamas/ementa`}
        actions={
          <div className="flex items-center gap-2">
            {diaAnterior !== null && (
              <Link href={`/campo/${id}/mamas/ementa/${diaAnterior}`} className="text-sm text-gray-500 hover:text-[#2D5016]">‹ Ant.</Link>
            )}
            {diaProximo !== null && (
              <Link href={`/campo/${id}/mamas/ementa/${diaProximo}`} className="text-sm text-gray-500 hover:text-[#2D5016]">Próx. ›</Link>
            )}
          </div>
        }
      />

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-3">
        {REFEICOES.map((refeicao) => {
          const slot = getSlot(refeicao)
          const alertas = slot ? getAlertas(slot) : []
          const receita = slot?.receita as { nome: string; categoria: string } | undefined
          const corCat = receita?.categoria ? CATEGORIA_CORES[receita.categoria as keyof typeof CATEGORIA_CORES] : ''

          return (
            <div key={refeicao}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {REFEICAO_LABELS[refeicao]}
              </p>
              {slot ? (
                <div className={cn('rounded-xl border p-4', corCat || 'bg-white border-[#E7E8D1]')}>
                  <p className="font-bold text-sm">
                    {receita?.nome ?? slot.receita_nome_custom ?? '—'}
                  </p>
                  {slot.responsavel && (
                    <p className="text-xs opacity-70 mt-0.5">Resp: {slot.responsavel}</p>
                  )}
                  {slot.notas && (
                    <p className="text-xs opacity-60 mt-0.5 italic">{slot.notas}</p>
                  )}
                  {alertas.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {alertas.map((a, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-red-600 bg-red-50 rounded-lg px-2 py-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="text-xs"><strong>{a.animadoNome}</strong>: {a.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-[#E7E8D1] p-4 text-center text-sm text-gray-300">
                  Sem {REFEICAO_LABELS[refeicao].toLowerCase()} planeado
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
