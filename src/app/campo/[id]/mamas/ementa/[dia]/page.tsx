import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/mamas/Header'
import { AlertTriangle } from 'lucide-react'
import type { Campo } from '@/types/shared'
import type { EmentaItem, RestricaoAlimentar } from '@/types/mamas'
import { REFEICAO_LABELS, TIPO_PRATO_LABELS } from '@/types/mamas'
import { getDiaLabel, getNumDias } from '@/types/shared'

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

  const [{ data: campo }, { data: slots }, { data: animados }, { data: restricoesCampo }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('ementa')
      .select('*, receita:receitas(id, nome, categoria, tags, receita_ingredientes(ingrediente:ingredientes(nome))), versao:receita_versoes(id, nome_versao, is_default)')
      .eq('campo_id', id)
      .eq('dia', dia)
      .order('ordem'),
    supabase
      .from('animados')
      .select('id, nome, restricoes:restricoes_alimentares(*)')
      .eq('campo_id', id),
    // Restricoes criadas diretamente por campo (após migration 014, sem animado_id)
    supabase
      .from('restricoes_alimentares')
      .select('*')
      .eq('campo_id', id)
      .is('animado_id', null),
  ])

  if (!campo) notFound()

  const c = campo as Campo
  const numDias = getNumDias(c.seccao)
  const diasValidos = [-2, -1, ...Array.from({ length: numDias }, (_, i) => i + 1)]
  if (!diasValidos.includes(dia)) notFound()

  // Unir restricoes via animado + restricoes directas por campo
  const restricoesViaAnimado: RestricaoAlimentar[] = (animados ?? []).flatMap(
    (a: { restricoes?: RestricaoAlimentar[] }) => a.restricoes ?? []
  )
  const restricoes: RestricaoAlimentar[] = [
    ...restricoesViaAnimado,
    ...((restricoesCampo ?? []) as RestricaoAlimentar[]),
  ]

  function getSlots(refeicao: string): EmentaItem[] {
    return (slots ?? []).filter((s: EmentaItem) => s.refeicao === refeicao) as EmentaItem[]
  }

  function getAlertas(slot: EmentaItem): { criancaNome: string; descricao: string; gravidade?: string | null }[] {
    if (!slot?.receita) return []
    const alertas: { criancaNome: string; descricao: string; gravidade?: string | null }[] = []
    const ingredientesReceita: string[] = (slot.receita as unknown as {
      receita_ingredientes?: { ingrediente?: { nome: string } }[]
    })?.receita_ingredientes?.map((ri) => ri.ingrediente?.nome?.toLowerCase() ?? '') ?? []

    if (ingredientesReceita.length === 0) return []

    restricoes.forEach((r) => {
      const proibidos = r.ingredientes_proibidos ?? []
      if (proibidos.length === 0) return
      const match = proibidos.some((p) => ingredientesReceita.some((i) => i.includes(p.toLowerCase())))
      if (match) {
        const criancaNome =
          r.crianca_nome ??
          animados?.find((a: { id: string; nome: string }) => a.id === r.animado_id)?.nome ??
          'Criança'
        alertas.push({ criancaNome, descricao: r.descricao, gravidade: r.gravidade })
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

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">
        <Link
          href={`/campo/${id}/mamas/lista?gerar_dia=${dia}`}
          className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#E7E8D1] text-sm font-medium text-[#2D5016] bg-[#2D5016]/5 hover:bg-[#2D5016]/10 transition-colors"
        >
          🛒 Gerar lista de compras para este dia
        </Link>
        {REFEICOES.map((refeicao) => {
          const refSlots = getSlots(refeicao)
          const allAlertas = refSlots.flatMap((s) => getAlertas(s))

          return (
            <div key={refeicao}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {REFEICAO_LABELS[refeicao]}
              </p>
              {refSlots.length > 0 ? (
                <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 space-y-2">
                  {refSlots.map((slot) => (
                    <div key={slot.id} className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase w-20 shrink-0">
                        {TIPO_PRATO_LABELS[slot.tipo_prato ?? 'prato']}
                      </span>
                      <span className="text-sm font-medium text-[#36454F]">
                        {(slot.receita as { nome?: string } | undefined)?.nome ?? slot.receita_nome_custom ?? '—'}
                      </span>
                      {slot.versao && !slot.versao.is_default && (
                        <span className="text-xs text-[#2D5016] font-medium shrink-0">({slot.versao.nome_versao})</span>
                      )}
                      {slot.notas && (
                        <span className="text-xs text-gray-400 italic truncate">· {slot.notas}</span>
                      )}
                    </div>
                  ))}
                  {allAlertas.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-[#E7E8D1] pt-2">
                      {allAlertas.map((a, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-1.5 rounded-lg px-2 py-1 ${
                            a.gravidade === 'grave'
                              ? 'text-red-700 bg-red-50'
                              : a.gravidade === 'media'
                              ? 'text-orange-700 bg-orange-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="text-xs">
                            <strong>{a.criancaNome}</strong>: {a.descricao}
                            {a.gravidade === 'grave' && <span className="ml-1 font-bold">(grave)</span>}
                          </span>
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
