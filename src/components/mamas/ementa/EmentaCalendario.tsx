'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, AlertTriangle, Info, Copy, ChevronLeft, ChevronRight, Calendar, LayoutGrid, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmentaSlotModal, type PratoSave } from './EmentaSlotModal'
import type { Campo, SeccaoTipo } from '@/types/shared'
import { getDiaLabel, getNumDias } from '@/types/shared'
import {
  type EmentaItem,
  type RestricaoAlimentar,
  type RefeicaoTipo,
  type TipoPrato,
  REFEICAO_LABELS,
  CATEGORIA_CORES,
  TIPO_PRATO_LABELS,
} from '@/types/mamas'
import { cn as cnUtil } from '@/lib/utils'

const REFEICOES: RefeicaoTipo[] = ['pequeno_almoco', 'almoco', 'lanche', 'jantar', 'ceia']

type CorEscalao = { bg: string; text: string; light: string; border: string }
const COR_FALLBACK: CorEscalao = { bg: '#2D5016', text: '#1a3009', light: '#E7F3DD', border: '#86efac' }

interface EmentaCalendarioProps {
  campo: Campo
  ementaInicial: EmentaItem[]
  receitas: unknown[]
  restricoes: RestricaoAlimentar[]
  corEscalao?: CorEscalao
}

export function EmentaCalendario({ campo, ementaInicial, receitas, restricoes, corEscalao = COR_FALLBACK }: EmentaCalendarioProps) {
  const [ementa, setEmenta] = useState<EmentaItem[]>(ementaInicial)
  const [modalAberto, setModalAberto] = useState(false)
  const [slotSelecionado, setSlotSelecionado] = useState<{ dia: number; refeicao: RefeicaoTipo } | null>(null)
  const [cloneModalAberto, setCloneModalAberto] = useState(false)
  const [camposDisponiveis, setCamposDisponiveis] = useState<{ id: string; nome: string; ano?: number | null }[]>([])
  const [campoFonte, setCampoFonte] = useState<string>('')
  const [substituirExistente, setSubstituirExistente] = useState(false)
  const [clonando, setClonando] = useState(false)
  const [vista, setVista] = useState<'periodo' | 'dia' | 'semana'>('periodo')
  const supabase = createClient()

  const numDias = getNumDias(campo.seccao as SeccaoTipo)
  const temPrecampo = campo.data_precampo_inicio != null

  const diasList: number[] = []
  if (temPrecampo) {
    diasList.push(-2, -1)
  }
  for (let i = 1; i <= numDias; i++) diasList.push(i)

  const [diaAtual, setDiaAtual] = useState<number>(() => {
    if (!campo.data_inicio) return diasList[0]
    const inicio = new Date(campo.data_inicio)
    const hoje = new Date()
    inicio.setHours(0, 0, 0, 0)
    hoje.setHours(0, 0, 0, 0)
    const diff = Math.round((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diasList.includes(diff) ? diff : diasList[0]
  })

  function getDiaHoje(): number | null {
    if (!campo.data_inicio) return null
    const inicio = new Date(campo.data_inicio)
    const hoje = new Date()
    inicio.setHours(0, 0, 0, 0)
    hoje.setHours(0, 0, 0, 0)
    const diff = Math.round((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diasList.includes(diff) ? diff : null
  }

  const diaHoje = getDiaHoje()
  const diaIndex = diasList.indexOf(diaAtual)

  // Devolver todos os pratos de uma (dia, refeicao)
  function getSlots(dia: number, refeicao: RefeicaoTipo): EmentaItem[] {
    return ementa.filter((e) => e.dia === dia && e.refeicao === refeicao)
      .sort((a, b) => a.ordem - b.ordem)
  }

  function getDayState(dia: number): 'vazio' | 'parcial' | 'completo' {
    const temAlmoco = getSlots(dia, 'almoco').length > 0
    const temJantar = getSlots(dia, 'jantar').length > 0
    const temAlgum = REFEICOES.some((r) => getSlots(dia, r).length > 0)
    if (!temAlgum) return 'vazio'
    if (temAlmoco && temJantar) return 'completo'
    return 'parcial'
  }

  function getAlertasSlot(dia: number, refeicao: RefeicaoTipo): string[] {
    const slots = getSlots(dia, refeicao)
    const alertas: string[] = []
    slots.forEach((slot) => {
      if (!slot.receita) return
      restricoes.forEach((r) => {
        const proibidos = r.ingredientes_proibidos ?? []
        if (proibidos.length === 0) return
        const receitaIngredientes = (slot.receita as unknown as { receita_ingredientes?: { ingrediente?: { nome: string } }[] })?.receita_ingredientes ?? []
        const match = receitaIngredientes.some((ri) => {
          const nomeIng = ri.ingrediente?.nome?.toLowerCase() ?? ''
          return proibidos.some((p) => nomeIng.includes(p.toLowerCase()))
        })
        if (match) alertas.push(`${r.animado?.nome ?? 'Animado'} — ${r.descricao}`)
      })
    })
    return alertas
  }

  function abrirSlot(dia: number, refeicao: RefeicaoTipo) {
    setSlotSelecionado({ dia, refeicao })
    setModalAberto(true)
  }

  async function salvarPratos(pratos: PratoSave[]) {
    if (!slotSelecionado) return
    const { dia, refeicao } = slotSelecionado
    const existentes = getSlots(dia, refeicao)

    try {
      if (existentes.length > 0) {
        const { error } = await supabase.from('ementa').delete().in('id', existentes.map((e) => e.id))
        if (error) throw error
      }

      if (pratos.length > 0) {
        const { data, error } = await supabase
          .from('ementa')
          .insert(
            pratos.map((p, i) => ({
              campo_id: campo.id,
              dia,
              refeicao,
              tipo_prato: p.tipo_prato,
              receita_id: p.receita_id ?? null,
              receita_versao_id: p.receita_versao_id ?? null,
              receita_nome_custom: p.receita_nome_custom ?? null,
              notas: p.notas ?? null,
              responsavel: null,
              ordem: i,
            }))
          )
          .select('*, receita:receitas(id, nome, categoria, tags), versao:receita_versoes(id, nome_versao, is_default)')
        if (error) throw error
        setEmenta((prev) => [
          ...prev.filter((e) => !(e.dia === dia && e.refeicao === refeicao)),
          ...(data as EmentaItem[]),
        ])
      } else {
        setEmenta((prev) => prev.filter((e) => !(e.dia === dia && e.refeicao === refeicao)))
      }

      toast.success('Refeição guardada')
      setModalAberto(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    }
  }

  async function removerRefeicao(dia: number, refeicao: RefeicaoTipo) {
    const existentes = getSlots(dia, refeicao)
    if (existentes.length === 0) return
    const { error } = await supabase.from('ementa').delete().in('id', existentes.map((e) => e.id))
    if (error) { toast.error('Erro ao remover'); return }
    setEmenta((prev) => prev.filter((e) => !(e.dia === dia && e.refeicao === refeicao)))
    toast.success('Refeição removida')
    setModalAberto(false)
  }

  async function abrirCloneModal() {
    // Filtrar por mesmo ano se disponível, senão mostrar todos por ordem descendente de nome
    let query = supabase.from('campos').select('id, nome, ano').neq('id', campo.id)
    if (campo.ano) query = query.eq('ano', campo.ano)
    query = query.order('nome')
    const { data } = await query
    setCamposDisponiveis((data ?? []).filter((c) => c.id !== campo.id))
    setCampoFonte('')
    setCloneModalAberto(true)
  }

  async function clonarEmenta() {
    if (!campoFonte) return
    setClonando(true)
    try {
      const { data: fonte, error: fetchErr } = await supabase
        .from('ementa')
        .select('dia, refeicao, tipo_prato, receita_id, receita_versao_id, receita_nome_custom, responsavel, notas, ordem')
        .eq('campo_id', campoFonte)
      if (fetchErr) throw fetchErr
      if (!fonte || fonte.length === 0) {
        toast.error('O campo selecionado não tem plano de refeições')
        return
      }

      // Substituir ementa existente se pedido
      if (substituirExistente && ementa.length > 0) {
        const { error: deleteErr } = await supabase
          .from('ementa')
          .delete()
          .in('id', ementa.map((e) => e.id))
        if (deleteErr) throw deleteErr
        setEmenta([])
      }

      const novosItems = fonte.map((item) => ({ ...item, campo_id: campo.id }))
      const { data: inseridos, error: insertErr } = await supabase
        .from('ementa')
        .insert(novosItems)
        .select('*, receita:receitas(id, nome, categoria, tags)')
      if (insertErr) throw insertErr
      setEmenta((prev) => (substituirExistente ? [] : prev).concat(inseridos as EmentaItem[]))
      setCloneModalAberto(false)
      toast.success(`Plano copiado com ${inseridos?.length ?? 0} entradas!`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao copiar')
    } finally {
      setClonando(false)
    }
  }

  const existingPratos = slotSelecionado
    ? getSlots(slotSelecionado.dia, slotSelecionado.refeicao)
    : []

  // Receitas oficiais de PA/Lanche — usadas para exibição virtual
  const receitasTyped = receitas as Array<{ id: string; nome: string; categoria: string; is_oficial: boolean }>
  const receitaPaDefault = receitasTyped.find((r) => r.is_oficial && r.nome === 'Pequeno-almoço')
    ?? receitasTyped.find((r) => r.is_oficial && r.categoria === 'pequeno_almoco')
  const receitaLancheDefault = receitasTyped.find((r) => r.is_oficial && r.nome === 'Bolachas')
    ?? receitasTyped.find((r) => r.is_oficial && r.categoria === 'lanche')

  // ── Slot card: mostra lista de pratos ─────────────────────────────────────
  function renderSlotCard(dia: number, refeicao: RefeicaoTipo, compact = false) {
    const slots = getSlots(dia, refeicao)
    const alertas = getAlertasSlot(dia, refeicao)

    if (slots.length > 0) {
      return (
        <button
          onClick={() => abrirSlot(dia, refeicao)}
          className={cnUtil(
            'w-full text-left rounded-xl border p-3 min-h-[56px] transition-all active:scale-[0.98] hover:shadow-md bg-white border-[#E7E8D1]',
            compact && 'p-2 rounded-lg min-h-[64px]'
          )}
        >
          <div className="space-y-0.5">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-baseline gap-1.5 min-w-0">
                <span className={cnUtil('text-[10px] font-bold text-gray-400 uppercase shrink-0', compact && 'text-[9px]')}>
                  {TIPO_PRATO_LABELS[slot.tipo_prato ?? 'prato']}
                </span>
                <span className={cnUtil('text-xs font-medium text-[#36454F] truncate', compact && 'text-[11px]')}>
                  {slot.receita?.nome ?? slot.receita_nome_custom ?? '—'}
                </span>
                {slot.versao && !slot.versao.is_default && (
                  <span className={cnUtil('text-[10px] text-[#2D5016] shrink-0 font-medium', compact && 'text-[9px]')}>
                    ({slot.versao.nome_versao})
                  </span>
                )}
              </div>
            ))}
          </div>
          {alertas.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-[#F96167]">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="text-[10px] truncate">{alertas[0]}{alertas.length > 1 ? ` +${alertas.length - 1}` : ''}</span>
            </div>
          )}
        </button>
      )
    }

    // PA/Lanche: exibição virtual com receita oficial como default
    const defaultVirtual =
      refeicao === 'pequeno_almoco' ? receitaPaDefault :
      refeicao === 'lanche' ? receitaLancheDefault :
      null

    if (defaultVirtual) {
      return (
        <button
          onClick={() => abrirSlot(dia, refeicao)}
          className={cnUtil(
            'w-full text-left rounded-xl border p-3 min-h-[56px] transition-all active:scale-[0.98] hover:shadow-md bg-[#f8f8f4] border-[#E7E8D1] border-dashed',
            compact && 'p-2 rounded-lg min-h-[64px]'
          )}
        >
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xs font-medium text-gray-400 truncate italic">
              {defaultVirtual.nome}
            </span>
            <span className="text-[10px] text-gray-300 shrink-0">— default</span>
          </div>
        </button>
      )
    }

    return (
      <button
        onClick={() => abrirSlot(dia, refeicao)}
        className={cnUtil(
          'w-full rounded-xl border-2 border-dashed border-[#E7E8D1] min-h-[56px] flex items-center justify-center gap-2 text-gray-400 hover:border-[#B85042] hover:text-[#B85042] hover:bg-[#B85042]/5 transition-colors active:scale-[0.98]',
          compact && 'min-h-[64px] rounded-lg opacity-0 group-hover:opacity-100'
        )}
      >
        <Plus className="h-4 w-4" />
        {!compact && <span className="text-sm">Adicionar {REFEICAO_LABELS[refeicao].toLowerCase()}</span>}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-[#E7E8D1]">
        {/* Back to period button when in dia/semana view */}
        {vista !== 'periodo' && (
          <button
            onClick={() => setVista('periodo')}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#36454F] transition-colors shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Período
          </button>
        )}

        <div className="flex-1 text-sm text-gray-500 hidden sm:flex items-center gap-2 flex-wrap">
          {vista === 'periodo' && (
            <>
              <span className="font-semibold text-[#36454F]">{campo.seccao}</span>
              <span>·</span>
              <span className="font-semibold" style={{ color: corEscalao.bg }}>{ementa.length} pratos planeados</span>
            </>
          )}
        </div>

        {/* View toggle — Dia / Semana (só visível fora do período) */}
        <div className="flex items-center bg-[#E7E8D1] rounded-lg p-0.5 gap-0.5 ml-auto">
          <button
            onClick={() => setVista('periodo')}
            className={cnUtil(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              vista === 'periodo' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-[#36454F]'
            )}
            style={vista === 'periodo' ? { color: corEscalao.bg } : undefined}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Período</span>
          </button>
          <button
            onClick={() => setVista('dia')}
            className={cnUtil(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              vista === 'dia' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-[#36454F]'
            )}
            style={vista === 'dia' ? { color: corEscalao.bg } : undefined}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Dia</span>
          </button>
        </div>
      </div>

      {/* ── VISTA PERÍODO ── */}
      {vista === 'periodo' && (
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-2 max-w-lg mx-auto">
            {diasList.map((dia) => {
              const slots = REFEICOES.flatMap((r) => getSlots(dia, r))
              const almoco = getSlots(dia, 'almoco')
              const jantar = getSlots(dia, 'jantar')
              const isToday = dia === diaHoje
              const state = getDayState(dia)

              return (
                <button
                  key={dia}
                  onClick={() => { setDiaAtual(dia); setVista('dia') }}
                  className="w-full text-left bg-white rounded-xl border border-[#E7E8D1] px-4 py-3 hover:shadow-md active:scale-[0.99] transition-all"
                  style={isToday ? { borderColor: corEscalao.bg, borderWidth: 2 } : undefined}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#36454F]">{getDiaLabel(dia)}</span>
                      {isToday && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: corEscalao.bg }}>Hoje</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {state === 'completo' && <span className="text-[10px] text-green-600 font-semibold">✓ Completo</span>}
                      {state === 'parcial' && <span className="text-[10px] text-yellow-600 font-semibold">Parcial</span>}
                      {state === 'vazio' && <span className="text-[10px] text-gray-300 font-medium">Por definir</span>}
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    </div>
                  </div>
                  {slots.length > 0 ? (
                    <div className="space-y-0.5">
                      {almoco.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          <span className="font-semibold">Almoço:</span>{' '}
                          {almoco.map((s) => s.receita?.nome ?? s.receita_nome_custom ?? '—').join(' · ')}
                        </p>
                      )}
                      {jantar.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          <span className="font-semibold">Jantar:</span>{' '}
                          {jantar.map((s) => s.receita?.nome ?? s.receita_nome_custom ?? '—').join(' · ')}
                        </p>
                      )}
                      {almoco.length === 0 && jantar.length === 0 && (
                        <p className="text-xs text-gray-400">
                          {REFEICOES.filter((r) => getSlots(dia, r).length > 0).map((r) => REFEICAO_LABELS[r]).join(' · ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300">Sem refeições definidas</p>
                  )}
                </button>
              )
            })}

            {/* Copy action when empty */}
            {ementa.length === 0 && (
              <div className="pt-4 border-t border-[#E7E8D1] text-center">
                <p className="text-xs text-gray-400 mb-2">Já tens um plano noutro campo?</p>
                <button
                  onClick={abrirCloneModal}
                  className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                  style={{ color: corEscalao.bg }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar plano existente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VISTA DIA ── */}
      {vista === 'dia' && (
        <div className="flex-1 overflow-auto">
          {/* Day navigation header */}
          <div className="sticky top-0 z-10 bg-white border-b border-[#E7E8D1] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => diaIndex > 0 && setDiaAtual(diasList[diaIndex - 1])}
                disabled={diaIndex === 0}
                className="p-2 rounded-lg hover:bg-[#E7E8D1] transition-colors disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5 text-[#36454F]" />
              </button>

              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-bold text-[#36454F] text-base">{getDiaLabel(diaAtual)}</span>
                  {diaAtual === diaHoje && (
                    <Badge className="text-white text-[10px] py-0 px-1.5 border-0" style={{ backgroundColor: corEscalao.bg }}>Hoje</Badge>
                  )}
                  {(() => {
                    const state = getDayState(diaAtual)
                    if (state === 'completo') return <span className="text-[10px] text-green-600 font-medium">✓ Completo</span>
                    if (state === 'parcial') return <span className="text-[10px] text-yellow-600 font-medium">Parcial</span>
                    return null
                  })()}
                </div>
                <Link
                  href={`/campo/${campo.id}/mamas/ementa/${diaAtual}`}
                  className="text-xs text-[#B85042] hover:underline flex items-center justify-center gap-1 mt-0.5"
                >
                  Ver detalhe
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <button
                onClick={() => diaIndex < diasList.length - 1 && setDiaAtual(diasList[diaIndex + 1])}
                disabled={diaIndex === diasList.length - 1}
                className="p-2 rounded-lg hover:bg-[#E7E8D1] transition-colors disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronRight className="h-5 w-5 text-[#36454F]" />
              </button>
            </div>

            {/* Day pills row */}
            <div className="flex flex-wrap gap-1.5 mt-3 pb-1">
              {diasList.map((dia) => {
                const state = getDayState(dia)
                const isToday = dia === diaHoje
                const isSelected = dia === diaAtual
                return (
                  <button
                    key={dia}
                    onClick={() => setDiaAtual(dia)}
                    className={cnUtil(
                      'shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border min-w-[44px]',
                      !isSelected && !isToday && (
                        state === 'completo'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : state === 'parcial'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-white text-gray-500 border-[#E7E8D1]'
                      )
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: corEscalao.bg, borderColor: corEscalao.bg, color: 'white' }
                        : isToday
                          ? { backgroundColor: corEscalao.bg + '18', color: corEscalao.bg, borderColor: corEscalao.bg + '40' }
                          : undefined
                    }
                  >
                    <span>{dia < 0 ? (dia === -2 ? 'P-2' : 'P-1') : `D${dia}`}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Meals for the current day */}
          <div className="p-4 space-y-3">
            {REFEICOES.map((refeicao) => (
              <div key={refeicao}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                  {REFEICAO_LABELS[refeicao]}
                </p>
                {renderSlotCard(diaAtual, refeicao)}
              </div>
            ))}

            {/* Ver todos os dias */}
            <div className="pt-4 border-t border-[#E7E8D1] text-center">
              <button
                onClick={() => setVista('periodo')}
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#36454F] transition-colors font-medium"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Ver todos os dias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA SEMANA (grid) ── */}
      {vista === 'semana' && (
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Header row */}
            <div className="flex sticky top-0 z-10 bg-[#E7E8D1]">
              <div className="w-28 shrink-0 border-r border-[#d0d1bb] py-2 px-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Refeição</span>
              </div>
              {diasList.map((dia) => (
                <div
                  key={dia}
                  className="w-36 shrink-0 border-r border-[#d0d1bb] py-2 px-2 text-center"
                  style={dia === diaHoje ? { backgroundColor: corEscalao.bg + '18' } : undefined}
                >
                  <Link
                    href={`/campo/${campo.id}/mamas/ementa/${dia}`}
                    className="block text-xs font-bold text-[#36454F] hover:text-[#B85042] transition-colors"
                  >
                    {getDiaLabel(dia)}
                  </Link>
                  {dia === diaHoje && (
                    <span className="text-[9px] font-bold" style={{ color: corEscalao.bg }}>Hoje</span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows per refeição */}
            {REFEICOES.map((refeicao) => (
              <div key={refeicao} className="flex border-b border-[#E7E8D1]">
                {/* Label */}
                <div className="w-28 shrink-0 border-r border-[#E7E8D1] py-2 px-2 bg-white">
                  <span className="text-xs font-semibold text-gray-600">
                    {REFEICAO_LABELS[refeicao]}
                  </span>
                </div>
                {/* Slots */}
                {diasList.map((dia) => (
                  <div
                    key={dia}
                    className="w-36 shrink-0 border-r border-[#E7E8D1] min-h-[80px] p-1 relative group"
                    style={dia === diaHoje ? { backgroundColor: corEscalao.bg + '0C' } : undefined}
                  >
                    {renderSlotCard(dia, refeicao, true)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white border-t border-[#E7E8D1] text-xs text-gray-500 flex-wrap">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Clica numa célula para adicionar ou editar pratos</span>
        <span>·</span>
        <span>Cada refeição pode ter sopa, prato, sobremesa, extra e outros</span>
      </div>

      {/* Modal de edição de pratos */}
      {modalAberto && slotSelecionado && (
        <EmentaSlotModal
          dia={slotSelecionado.dia}
          refeicao={slotSelecionado.refeicao}
          existingPratos={existingPratos}
          receitas={receitas}
          campoId={campo.id}
          campoNome={campo.nome}
          onSave={salvarPratos}
          onRemoveAll={() => removerRefeicao(slotSelecionado.dia, slotSelecionado.refeicao)}
          onClose={() => setModalAberto(false)}
        />
      )}

      {/* Clone ementa modal */}
      <Dialog open={cloneModalAberto} onOpenChange={setCloneModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar plano de refeições de outro campo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Seleciona o campo de origem. As refeições serão copiadas para este campo.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {camposDisponiveis.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sem outros campos disponíveis</p>
              ) : (
                camposDisponiveis.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCampoFonte(c.id)}
                    className={cnUtil(
                      'w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors',
                      campoFonte === c.id
                        ? 'bg-[#2D5016] text-white border-[#2D5016]'
                        : 'border-[#E7E8D1] hover:border-[#2D5016] text-[#36454F]'
                    )}
                  >
                    {c.nome}
                  </button>
                ))
              )}
            </div>
            {ementa.length > 0 && (
              <label className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={substituirExistente}
                  onChange={(e) => setSubstituirExistente(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#2D5016]"
                />
                <span className="text-sm text-amber-800">
                  <span className="font-semibold">Substituir plano existente</span>
                  <span className="block text-xs text-amber-600 mt-0.5">
                    Remove os {ementa.length} pratos actuais antes de copiar. Sem isto, os pratos são adicionados por cima e podem ficar duplicados.
                  </span>
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneModalAberto(false)}>Cancelar</Button>
            <Button
              onClick={clonarEmenta}
              disabled={!campoFonte || clonando}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90"
            >
              {clonando ? 'A copiar...' : 'Copiar plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
