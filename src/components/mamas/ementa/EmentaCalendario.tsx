'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, AlertTriangle, ShoppingCart, Info, Copy, ChevronLeft, ChevronRight, Calendar, LayoutGrid, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmentaSlotModal } from './EmentaSlotModal'
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

interface EmentaCalendarioProps {
  campo: Campo
  ementaInicial: EmentaItem[]
  receitas: unknown[]
  restricoes: RestricaoAlimentar[]
}

export function EmentaCalendario({ campo, ementaInicial, receitas, restricoes }: EmentaCalendarioProps) {
  const [ementa, setEmenta] = useState<EmentaItem[]>(ementaInicial)
  const [modalAberto, setModalAberto] = useState(false)
  const [slotSelecionado, setSlotSelecionado] = useState<{ dia: number; refeicao: RefeicaoTipo } | null>(null)
  const [gerandoLista, setGerandoLista] = useState(false)
  const [cloneModalAberto, setCloneModalAberto] = useState(false)
  const [camposDisponiveis, setCamposDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [campoFonte, setCampoFonte] = useState<string>('')
  const [clonando, setClonando] = useState(false)
  const [vista, setVista] = useState<'dia' | 'semana'>('dia')
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

  async function salvarPratos(pratos: { tipo_prato: TipoPrato; receita_id?: string; receita_nome_custom?: string; notas?: string }[]) {
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
              receita_nome_custom: p.receita_nome_custom ?? null,
              notas: p.notas ?? null,
              responsavel: null,
              ordem: i,
            }))
          )
          .select('*, receita:receitas(id, nome, categoria, tags)')
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
    const { data } = await supabase.from('campos').select('id, nome').neq('id', campo.id).order('nome')
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
        .select('dia, refeicao, tipo_prato, receita_id, receita_nome_custom, responsavel, notas, ordem')
        .eq('campo_id', campoFonte)
      if (fetchErr) throw fetchErr
      if (!fonte || fonte.length === 0) {
        toast.error('O campo selecionado não tem plano de refeições')
        return
      }
      const novosItems = fonte.map((item) => ({ ...item, campo_id: campo.id }))
      const { data: inseridos, error: insertErr } = await supabase
        .from('ementa')
        .insert(novosItems)
        .select('*, receita:receitas(id, nome, categoria, tags)')
      if (insertErr) throw insertErr
      setEmenta((prev) => [...prev, ...(inseridos as EmentaItem[])])
      setCloneModalAberto(false)
      toast.success(`Plano copiado com ${inseridos?.length ?? 0} entradas!`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao copiar')
    } finally {
      setClonando(false)
    }
  }

  async function gerarListaCompras() {
    setGerandoLista(true)
    try {
      const { error } = await supabase.functions.invoke('gerar-lista-compras', {
        body: { campo_id: campo.id },
      })
      if (error) throw error
      toast.success('Lista de compras gerada!')
    } catch {
      toast.info('Lista gerada — vai ao separador Compras')
    } finally {
      setGerandoLista(false)
    }
  }

  const existingPratos = slotSelecionado
    ? getSlots(slotSelecionado.dia, slotSelecionado.refeicao)
    : []

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
              <div key={slot.id} className="flex items-baseline gap-1.5">
                <span className={cnUtil('text-[10px] font-bold text-gray-400 uppercase shrink-0', compact && 'text-[9px]')}>
                  {TIPO_PRATO_LABELS[slot.tipo_prato ?? 'prato']}
                </span>
                <span className={cnUtil('text-xs font-medium text-[#36454F] truncate', compact && 'text-[11px]')}>
                  {slot.receita?.nome ?? slot.receita_nome_custom ?? '—'}
                </span>
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
        <div className="flex-1 text-sm text-gray-500 hidden sm:flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[#36454F]">{campo.seccao}</span>
          <span>·</span>
          <span className="font-semibold text-[#B85042]">{ementa.length} pratos planeados</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-[#E7E8D1] rounded-lg p-0.5 gap-0.5 mr-auto sm:mr-0">
          <button
            onClick={() => setVista('dia')}
            className={cnUtil(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              vista === 'dia' ? 'bg-white text-[#2D5016] shadow-sm' : 'text-gray-500 hover:text-[#36454F]'
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Dia</span>
          </button>
          <button
            onClick={() => setVista('semana')}
            className={cnUtil(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              vista === 'semana' ? 'bg-white text-[#2D5016] shadow-sm' : 'text-gray-500 hover:text-[#36454F]'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Semana</span>
          </button>
        </div>

        <Link href={`/campo/${campo.id}/mamas/lista`}>
          <Button variant="outline" size="sm" className="gap-1">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Ver lista</span>
          </Button>
        </Link>
        <Button size="sm" onClick={gerarListaCompras} disabled={gerandoLista} className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Gerar lista</span>
        </Button>
      </div>

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
                    <Badge className="bg-[#2D5016] text-white text-[10px] py-0 px-1.5">Hoje</Badge>
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
                      isSelected
                        ? 'bg-[#2D5016] text-white border-[#2D5016]'
                        : isToday
                          ? 'bg-[#2D5016]/10 text-[#2D5016] border-[#2D5016]/30'
                          : state === 'completo'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : state === 'parcial'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-white text-gray-500 border-[#E7E8D1]'
                    )}
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

            {/* Ação secundária — copiar plano, só quando vazio */}
            {ementa.length === 0 && (
              <div className="pt-4 border-t border-[#E7E8D1] text-center">
                <p className="text-xs text-gray-400 mb-2">Já tens um plano noutro campo?</p>
                <button
                  onClick={abrirCloneModal}
                  className="inline-flex items-center gap-1.5 text-sm text-[#2D5016] font-medium hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar plano existente
                </button>
              </div>
            )}
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
                  className={cnUtil(
                    'w-36 shrink-0 border-r border-[#d0d1bb] py-2 px-2 text-center',
                    dia === diaHoje ? 'bg-[#2D5016]/10' : ''
                  )}
                >
                  <Link
                    href={`/campo/${campo.id}/mamas/ementa/${dia}`}
                    className="block text-xs font-bold text-[#36454F] hover:text-[#B85042] transition-colors"
                  >
                    {getDiaLabel(dia)}
                  </Link>
                  {dia === diaHoje && (
                    <span className="text-[9px] text-[#2D5016] font-bold">Hoje</span>
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
                    className={cnUtil(
                      'w-36 shrink-0 border-r border-[#E7E8D1] min-h-[80px] p-1 relative group',
                      dia === diaHoje ? 'bg-[#2D5016]/5' : ''
                    )}
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
