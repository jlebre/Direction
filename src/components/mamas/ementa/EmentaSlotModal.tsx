'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Trash2, Plus, X, ChevronLeft, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn as cnUtil } from '@/lib/utils'
import { getDiaLabel } from '@/types/shared'
import {
  type EmentaItem,
  type RefeicaoTipo,
  type TipoPrato,
  REFEICAO_LABELS,
  CATEGORIA_LABELS,
  CATEGORIA_CORES,
  TIPO_PRATO_LABELS,
} from '@/types/mamas'

// ── Tipos internos ────────────────────────────────────────────────────────────

interface PratoEdit {
  tempId: string
  tipo_prato: TipoPrato
  modo: 'receita' | 'custom'
  receita_id?: string
  receita_nome?: string
  receita_versao_id?: string
  receita_versao_nome?: string
  receita_nome_custom?: string
  notas?: string
}

export interface PratoSave {
  tipo_prato: TipoPrato
  receita_id?: string
  receita_versao_id?: string
  receita_nome_custom?: string
  notas?: string
}

type PickerEtapa = 'receita' | 'versao' | 'nova_versao'

interface VersaoCarregada {
  id: string
  nome_versao: string
  is_default: boolean
  campo_id?: string | null
  criada_por?: string | null
  notas?: string | null
  campo?: { nome: string } | null
}

type ReceitaLite = {
  id: string
  nome: string
  categoria: string
  tags: string[] | null
  is_oficial: boolean
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_PRATO: TipoPrato[] = ['sopa', 'prato', 'sobremesa', 'extra', 'bebida', 'outro']

// Refeições com slots fixos (sopa/prato/sobremesa/extra pré-preenchidos)
const SLOT_FIXO_REFEICOES: RefeicaoTipo[] = ['almoco', 'jantar']
const SLOT_FIXOS: TipoPrato[] = ['sopa', 'prato', 'sobremesa', 'extra']

// Categorias de receita correspondentes a cada tipo de slot
const CATEGORIAS_POR_SLOT: Partial<Record<TipoPrato, string[]>> = {
  sopa: ['sopa'],
  prato: ['carne', 'frango', 'bacalhau', 'atum', 'massa', 'arroz_pure'],
  sobremesa: ['doce', 'fruta'],
  extra: ['lanche', 'outro', 'molho', 'salada', 'pequeno_almoco'],
  bebida: ['lanche', 'outro'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gerarTempId() {
  return Math.random().toString(36).slice(2)
}

function fromExistingItems(items: EmentaItem[]): PratoEdit[] {
  return items.map((item) => ({
    tempId: gerarTempId(),
    tipo_prato: item.tipo_prato ?? 'prato',
    modo: item.receita_id ? 'receita' : 'custom',
    receita_id: item.receita_id,
    receita_nome: (item.receita as { nome?: string } | undefined)?.nome,
    receita_versao_id: item.receita_versao_id ?? undefined,
    receita_versao_nome: item.versao && !item.versao.is_default ? item.versao.nome_versao : undefined,
    receita_nome_custom: item.receita_nome_custom,
    notas: item.notas,
  }))
}

function getInitialPratos(
  refeicao: RefeicaoTipo,
  items: EmentaItem[],
  receitas: ReceitaLite[]
): PratoEdit[] {
  // Existindo pratos salvos, preservá-los sempre
  if (items.length > 0) return fromExistingItems(items)

  // Pequeno-almoço: preferir receita oficial chamada "Pequeno-almoço" (omnibus)
  if (refeicao === 'pequeno_almoco') {
    const r = receitas.find((r) => r.is_oficial && r.nome === 'Pequeno-almoço')
      ?? receitas.find((r) => r.is_oficial && r.categoria === 'pequeno_almoco')
    return [{
      tempId: gerarTempId(),
      tipo_prato: 'prato',
      modo: 'receita',
      ...(r ? { receita_id: r.id, receita_nome: r.nome } : {}),
    }]
  }

  // Lanche: preferir receita oficial chamada "Bolachas"
  if (refeicao === 'lanche') {
    const r = receitas.find((r) => r.is_oficial && r.nome === 'Bolachas')
      ?? receitas.find((r) => r.is_oficial && r.categoria === 'lanche')
    return [{
      tempId: gerarTempId(),
      tipo_prato: 'prato',
      modo: 'receita',
      ...(r ? { receita_id: r.id, receita_nome: r.nome } : {}),
    }]
  }

  // Almoço/Jantar: 4 slots fixos vazios
  if (SLOT_FIXO_REFEICOES.includes(refeicao)) {
    return SLOT_FIXOS.map((tipo) => ({
      tempId: gerarTempId(),
      tipo_prato: tipo,
      modo: 'receita' as const,
    }))
  }

  // Default: 1 slot vazio
  return [{ tempId: gerarTempId(), tipo_prato: 'prato', modo: 'receita' }]
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmentaSlotModalProps {
  dia: number
  refeicao: RefeicaoTipo
  existingPratos: EmentaItem[]
  receitas: unknown[]
  campoId: string
  campoNome: string
  numAnimados?: number
  numAnimadores?: number
  onSave: (pratos: PratoSave[], numPessoas: number | null, numAnimados: number | null, numAnimadores: number | null) => Promise<void>
  onRemoveAll: () => void
  onClose: () => void
}

// ── Componente ────────────────────────────────────────────────────────────────

export function EmentaSlotModal({
  dia,
  refeicao,
  existingPratos,
  receitas,
  campoId,
  campoNome,
  numAnimados = 0,
  numAnimadores = 0,
  onSave,
  onRemoveAll,
  onClose,
}: EmentaSlotModalProps) {
  const [pratos, setPratos] = useState<PratoEdit[]>(() =>
    getInitialPratos(refeicao, existingPratos, receitas as ReceitaLite[])
  )
  const [saving, setSaving] = useState(false)

  // num_pessoas: null = usar total do campo, número = override por refeição
  const totalCampo = numAnimados + numAnimadores
  const [numPessoas, setNumPessoas] = useState<number | null>(
    existingPratos[0]?.num_pessoas ?? null
  )
  const [numAnimadosCustom, setNumAnimadosCustom] = useState<string>(
    existingPratos[0]?.num_animados?.toString() ?? ''
  )
  const [numAnimadoresCustom, setNumAnimadoresCustom] = useState<string>(
    existingPratos[0]?.num_animadores?.toString() ?? ''
  )

  type NumPreset = 'campo' | 'animados' | 'animadores' | 'custom'
  function calcInitialPreset(): NumPreset {
    const np = existingPratos[0]?.num_pessoas ?? null
    const na = existingPratos[0]?.num_animados ?? null
    const nad = existingPratos[0]?.num_animadores ?? null
    if (np === null) return 'campo'
    if (na != null || nad != null) return 'custom'
    if (np === numAnimados && numAnimados > 0) return 'animados'
    if (np === numAnimadores && numAnimadores > 0) return 'animadores'
    return 'custom'
  }
  const [preset, setPresetState] = useState<NumPreset>(calcInitialPreset)
  function setPreset(p: NumPreset) {
    setPresetState(p)
    if (p === 'campo') { setNumPessoas(null); setNumAnimadosCustom(''); setNumAnimadoresCustom('') }
    else if (p === 'animados') { setNumPessoas(numAnimados); setNumAnimadosCustom(''); setNumAnimadoresCustom('') }
    else if (p === 'animadores') { setNumPessoas(numAnimadores); setNumAnimadosCustom(''); setNumAnimadoresCustom('') }
    // 'custom': não alterar numPessoas nem os campos — o utilizador define-os
  }

  // Picker state
  const [pickerIdx, setPickerIdx] = useState<number | null>(null)
  const [pickerEtapa, setPickerEtapa] = useState<PickerEtapa>('receita')
  const [pesquisa, setPesquisa] = useState('')
  const [pickerReceita, setPickerReceita] = useState<{ id: string; nome: string } | null>(null)
  const [pickerVersoes, setPickerVersoes] = useState<VersaoCarregada[]>([])
  const [carregandoVersoes, setCarregandoVersoes] = useState(false)
  const [filtroDesativado, setFiltroDesativado] = useState(false)

  // Criar rascunho state
  const [criando, setCriando] = useState(false)

  // Nova versão form state
  const [novaVersaoForm, setNovaVersaoForm] = useState({
    nome: '', notas: '', especifica: true, criada_por: '',
  })
  const [criandoVersao, setCriandoVersao] = useState(false)
  const [baseVersaoId, setBaseVersaoId] = useState<string | undefined>()

  const supabase = createClient()
  const isSlotFixo = SLOT_FIXO_REFEICOES.includes(refeicao)

  // ── Sugestões por tipo de refeição (só PA/Lanche não auto-preenchidos) ───────

  const sugestoesPicker = useMemo(() => {
    if (refeicao !== 'pequeno_almoco' && refeicao !== 'lanche') return []
    const cat = refeicao === 'pequeno_almoco' ? 'pequeno_almoco' : 'lanche'
    return (receitas as ReceitaLite[])
      .filter((r) => r.categoria === cat)
      .sort((a, b) => (b.is_oficial ? 1 : 0) - (a.is_oficial ? 1 : 0))
  }, [receitas, refeicao])

  const todosVazios = pratos.every((p) => !p.receita_id && !p.receita_nome_custom?.trim())

  function adicionarReceitaDefault(r: ReceitaLite) {
    const novoPrato: PratoEdit = {
      tempId: gerarTempId(),
      tipo_prato: 'prato',
      modo: 'receita',
      receita_id: r.id,
      receita_nome: r.nome,
    }
    if (pratos.length === 1 && todosVazios) {
      setPratos([novoPrato])
    } else {
      setPratos((prev) => [...prev, novoPrato])
    }
  }

  // ── Receitas filtradas (por pesquisa + tipo do slot atual) ──────────────────

  const receitasFiltradas = useMemo(() => {
    const q = pesquisa.toLowerCase()
    const slotTipo = pickerIdx !== null ? pratos[pickerIdx]?.tipo_prato : null
    const categoriasFiltro =
      !filtroDesativado && slotTipo ? (CATEGORIAS_POR_SLOT[slotTipo] ?? []) : []

    return (receitas as ReceitaLite[]).filter((r) => {
      const matchPesquisa =
        !q ||
        r.nome.toLowerCase().includes(q) ||
        CATEGORIA_LABELS[r.categoria as keyof typeof CATEGORIA_LABELS]?.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q))
      const matchCat = categoriasFiltro.length === 0 || categoriasFiltro.includes(r.categoria)
      return matchPesquisa && matchCat
    })
  }, [receitas, pesquisa, pickerIdx, pratos, filtroDesativado])

  // ── Prato list helpers ──────────────────────────────────────────────────────

  function upd(idx: number, patch: Partial<PratoEdit>) {
    setPratos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function addPrato() {
    setPratos((prev) => [
      ...prev,
      { tempId: gerarTempId(), tipo_prato: 'prato', modo: 'receita' },
    ])
  }

  function removePrato(idx: number) {
    setPratos((prev) => prev.filter((_, i) => i !== idx))
  }

  // Limpa slot fixo (volta a vazio) sem remover a linha
  function clearSlot(idx: number) {
    upd(idx, {
      modo: 'receita',
      receita_id: undefined,
      receita_nome: undefined,
      receita_versao_id: undefined,
      receita_versao_nome: undefined,
      receita_nome_custom: undefined,
    })
  }

  // ── Picker navigation ───────────────────────────────────────────────────────

  function openPicker(idx: number) {
    setPesquisa('')
    setFiltroDesativado(false)
    setPickerIdx(idx)
    setPickerEtapa('receita')
    setPickerReceita(null)
    setPickerVersoes([])
  }

  function fecharPicker() {
    setPickerIdx(null)
    setPickerEtapa('receita')
    setPickerReceita(null)
    setPickerVersoes([])
    setNovaVersaoForm({ nome: '', notas: '', especifica: true, criada_por: '' })
    setBaseVersaoId(undefined)
  }

  async function selecionarReceita(receita: { id: string; nome: string }) {
    setCarregandoVersoes(true)
    try {
      const { data } = await supabase
        .from('receita_versoes')
        .select('*, campo:campos(nome)')
        .eq('receita_id', receita.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
      const versoes = (data ?? []) as VersaoCarregada[]

      // Sem versões: criar Default automaticamente e selecionar
      if (versoes.length === 0 && pickerIdx !== null) {
        const { data: novaV, error: vErr } = await supabase
          .from('receita_versoes')
          .insert({ receita_id: receita.id, nome_versao: 'Default', is_default: true, estado: 'completa' })
          .select('id, nome_versao, is_default')
          .single()
        if (vErr) throw vErr
        upd(pickerIdx, {
          modo: 'receita',
          receita_id: receita.id,
          receita_nome: receita.nome,
          receita_versao_id: novaV.id,
          receita_versao_nome: undefined,
        })
        fecharPicker()
        return
      }

      // Com exatamente 1 versão: selecionar automaticamente
      if (versoes.length === 1 && pickerIdx !== null) {
        const v = versoes[0]
        upd(pickerIdx, {
          modo: 'receita',
          receita_id: receita.id,
          receita_nome: receita.nome,
          receita_versao_id: v.id,
          receita_versao_nome: v.is_default ? undefined : v.nome_versao,
        })
        fecharPicker()
        return
      }

      // Versão Default entre múltiplas: selecionar automaticamente
      const defaultV = versoes.find((v) => v.is_default)
      if (defaultV && pickerIdx !== null) {
        upd(pickerIdx, {
          modo: 'receita',
          receita_id: receita.id,
          receita_nome: receita.nome,
          receita_versao_id: defaultV.id,
          receita_versao_nome: undefined,
        })
        fecharPicker()
        return
      }

      setPickerReceita(receita)
      setPickerEtapa('versao')
      setPickerVersoes(versoes)
    } catch {
      toast.error('Erro ao carregar versões')
    } finally {
      setCarregandoVersoes(false)
    }
  }

  function selecionarVersao(versao: VersaoCarregada) {
    if (pickerIdx === null || !pickerReceita) return
    upd(pickerIdx, {
      modo: 'receita',
      receita_id: pickerReceita.id,
      receita_nome: pickerReceita.nome,
      receita_versao_id: versao.id,
      receita_versao_nome: versao.is_default ? undefined : versao.nome_versao,
    })
    fecharPicker()
  }

  function abrirNovaVersao(baseVersao?: VersaoCarregada) {
    setBaseVersaoId(baseVersao?.id)
    setNovaVersaoForm({
      nome: baseVersao ? `Cópia de ${baseVersao.nome_versao}` : '',
      notas: baseVersao?.notas ?? '',
      especifica: true,
      criada_por: '',
    })
    setPickerEtapa('nova_versao')
  }

  // ── Create actions ──────────────────────────────────────────────────────────

  async function criarRascunho(nome: string) {
    setCriando(true)
    // Inferir categoria pelo tipo do slot atual
    const slotTipo = pickerIdx !== null ? pratos[pickerIdx]?.tipo_prato : null
    const categoriaMap: Partial<Record<TipoPrato, string>> = {
      sopa: 'sopa',
      sobremesa: 'doce',
    }
    const categoria = (slotTipo && categoriaMap[slotTipo]) || 'outro'

    try {
      const { data: receita, error: rErr } = await supabase
        .from('receitas')
        .insert({ nome, categoria, is_oficial: false })
        .select('id, nome')
        .single()
      if (rErr) throw rErr

      const { data: versao, error: vErr } = await supabase
        .from('receita_versoes')
        .insert({ receita_id: receita.id, nome_versao: 'Default', is_default: true, estado: 'rascunho' })
        .select('id, nome_versao, is_default')
        .single()
      if (vErr) throw vErr

      if (pickerIdx !== null) {
        upd(pickerIdx, {
          modo: 'receita',
          receita_id: receita.id,
          receita_nome: receita.nome,
          receita_versao_id: versao.id,
          receita_versao_nome: undefined,
        })
      }
      fecharPicker()
      toast.success(`Receita "${nome}" criada — preenche os detalhes depois`)
    } catch {
      toast.error('Erro ao criar receita')
    } finally {
      setCriando(false)
    }
  }

  async function criarVersao() {
    if (!pickerReceita || !novaVersaoForm.nome.trim()) return
    setCriandoVersao(true)
    try {
      const { data, error } = await supabase
        .from('receita_versoes')
        .insert({
          receita_id: pickerReceita.id,
          nome_versao: novaVersaoForm.nome.trim(),
          notas: novaVersaoForm.notas.trim() || null,
          campo_id: novaVersaoForm.especifica ? campoId : null,
          criada_por: novaVersaoForm.criada_por.trim() || null,
          is_default: false,
          estado: 'completa',
        })
        .select('*, campo:campos(nome)')
        .single()
      if (error) throw error
      selecionarVersao(data as VersaoCarregada)
      toast.success('Versão criada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar versão')
    } finally {
      setCriandoVersao(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const valid = pratos.filter((p) => {
      if (p.modo === 'receita') return !!p.receita_id
      return !!(p.receita_nome_custom?.trim())
    })
    if (valid.length === 0) return

    let saveNumPessoas = numPessoas
    let saveNumAnimados: number | null = null
    let saveNumAnimadores: number | null = null

    if (preset === 'custom') {
      const a = parseInt(numAnimadosCustom) || 0
      const ad = parseInt(numAnimadoresCustom) || 0
      if (a > 0 || ad > 0) {
        saveNumAnimados = a > 0 ? a : null
        saveNumAnimadores = ad > 0 ? ad : null
        saveNumPessoas = (a + ad) > 0 ? (a + ad) : null
      }
    }

    setSaving(true)
    try {
      await onSave(
        valid.map((p) => ({
          tipo_prato: p.tipo_prato,
          receita_id: p.modo === 'receita' ? p.receita_id : undefined,
          receita_versao_id: p.modo === 'receita' ? p.receita_versao_id : undefined,
          receita_nome_custom:
            p.modo === 'custom' ? (p.receita_nome_custom?.trim() || undefined) : undefined,
          notas: p.notas?.trim() || undefined,
        })),
        saveNumPessoas,
        saveNumAnimados,
        saveNumAnimadores
      )
    } finally {
      setSaving(false)
    }
  }

  const canSave = pratos.some((p) =>
    p.modo === 'receita' ? !!p.receita_id : !!(p.receita_nome_custom?.trim())
  )

  // ── PICKER: Nova versão ───────────────────────────────────────────────────

  if (pickerIdx !== null && pickerEtapa === 'nova_versao') {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerEtapa('versao')}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <span className="truncate">
                Nova versão · <span className="font-normal text-gray-500">{pickerReceita?.nome}</span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome da versão *</Label>
              <Input
                autoFocus
                placeholder="Ex: Vegetariana, Sem glúten, Campo 2024..."
                value={novaVersaoForm.nome}
                onChange={(e) => setNovaVersaoForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Substituições, ajustes, dicas..."
                value={novaVersaoForm.notas}
                onChange={(e) => setNovaVersaoForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Criada por (opcional)</Label>
              <Input
                placeholder="Nome da Mamã..."
                value={novaVersaoForm.criada_por}
                onChange={(e) => setNovaVersaoForm((f) => ({ ...f, criada_por: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={novaVersaoForm.especifica}
                onChange={(e) => setNovaVersaoForm((f) => ({ ...f, especifica: e.target.checked }))}
                className="rounded border-gray-300 text-[#2D5016] focus:ring-[#2D5016]"
              />
              <div>
                <p className="text-sm font-medium text-[#36454F]">Específica deste campo</p>
                <p className="text-xs text-gray-400">{campoNome}</p>
              </div>
            </label>
            {!novaVersaoForm.especifica && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
                Versão partilhada — visível para todos os campos.
              </p>
            )}
            {baseVersaoId && (
              <p className="text-xs text-[#2D5016] bg-[#2D5016]/5 rounded-lg p-2">
                Duplicada de uma versão existente. Podes adaptar livremente.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerEtapa('versao')}>Cancelar</Button>
            <Button
              onClick={criarVersao}
              disabled={!novaVersaoForm.nome.trim() || criandoVersao}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90"
            >
              {criandoVersao ? 'A criar...' : 'Criar versão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ── PICKER: Versões ───────────────────────────────────────────────────────

  if (pickerIdx !== null && pickerEtapa === 'versao') {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setPickerEtapa('receita'); setPesquisa('') }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <span className="truncate">{pickerReceita?.nome}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Versões disponíveis</p>

            {carregandoVersoes ? (
              <div className="py-8 text-center text-sm text-gray-400">A carregar versões...</div>
            ) : pickerVersoes.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">Sem versões criadas ainda.</div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {pickerVersoes.map((versao) => (
                  <div
                    key={versao.id}
                    className="flex items-center gap-2 rounded-lg border border-[#E7E8D1] hover:border-[#2D5016]/30 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => selecionarVersao(versao)}
                      className="flex-1 text-left px-3 py-3 min-h-[48px]"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#36454F]">{versao.nome_versao}</span>
                        {versao.is_default && (
                          <Badge className="text-[10px] bg-[#2D5016]/10 text-[#2D5016] border-0 py-0 px-1.5">Default</Badge>
                        )}
                        {versao.campo && !versao.is_default && (
                          <span className="text-xs text-gray-400">{versao.campo.nome}</span>
                        )}
                        {versao.criada_por && (
                          <span className="text-xs text-gray-400">· {versao.criada_por}</span>
                        )}
                      </div>
                      {versao.notas && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{versao.notas}</p>
                      )}
                    </button>
                    {!versao.is_default && (
                      <button
                        type="button"
                        onClick={() => abrirNovaVersao(versao)}
                        title="Duplicar e adaptar"
                        className="shrink-0 p-2 mr-1 rounded-lg hover:bg-[#E7E8D1] transition-colors text-gray-400 hover:text-[#2D5016]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => abrirNovaVersao()}
              className="flex items-center gap-1.5 text-sm text-[#2D5016] font-medium hover:underline mr-auto"
            >
              <Plus className="h-4 w-4" />
              Nova versão
            </button>
            <Button variant="outline" onClick={() => { setPickerEtapa('receita'); setPesquisa('') }}>
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ── PICKER: Pesquisa de receitas ──────────────────────────────────────────

  if (pickerIdx !== null) {
    const slotAtual = pratos[pickerIdx]?.tipo_prato
    const temFiltroAtivo =
      !filtroDesativado && slotAtual && (CATEGORIAS_POR_SLOT[slotAtual]?.length ?? 0) > 0

    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button
                type="button"
                onClick={fecharPicker}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
              Escolher receita
              {slotAtual && (
                <span className="text-sm font-normal text-gray-400">
                  · {TIPO_PRATO_LABELS[slotAtual]}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Pesquisar receita..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                autoFocus
              />
            </div>

            {/* Filtro ativo — mostrar hint e opção "Ver todas" */}
            {temFiltroAtivo && (
              <div className="flex items-center justify-between text-xs bg-[#2D5016]/5 border border-[#2D5016]/10 rounded-lg px-3 py-1.5">
                <span className="text-[#2D5016]">
                  A mostrar: {TIPO_PRATO_LABELS[slotAtual!]}
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroDesativado(true)}
                  className="font-semibold text-[#2D5016] hover:underline ml-2 shrink-0"
                >
                  Ver todas
                </button>
              </div>
            )}
            {filtroDesativado && (
              <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <span className="text-gray-400">A mostrar todas as receitas</span>
                <button
                  type="button"
                  onClick={() => setFiltroDesativado(false)}
                  className="font-semibold text-gray-500 hover:underline ml-2 shrink-0"
                >
                  Filtrar por {slotAtual ? TIPO_PRATO_LABELS[slotAtual] : 'tipo'}
                </button>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-gray-200 p-1">
              {receitasFiltradas.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-gray-400">Nenhuma receita encontrada</p>
                  {pesquisa.trim().length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => criarRascunho(pesquisa.trim())}
                        disabled={criando}
                        className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-[#2D5016] bg-[#2D5016]/10 hover:bg-[#2D5016]/20 rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" />
                        {criando ? 'A criar...' : `Criar "${pesquisa.trim()}"`}
                      </button>
                      <p className="text-xs text-gray-400">Podes preencher os detalhes depois</p>
                    </>
                  )}
                  {temFiltroAtivo && pesquisa.trim().length === 0 && (
                    <button
                      type="button"
                      onClick={() => setFiltroDesativado(true)}
                      className="text-sm text-[#2D5016] hover:underline"
                    >
                      Ver todas as receitas
                    </button>
                  )}
                </div>
              ) : (
                receitasFiltradas.map((receita) => {
                  const corCat = CATEGORIA_CORES[receita.categoria as keyof typeof CATEGORIA_CORES]
                  return (
                    <button
                      key={receita.id}
                      type="button"
                      onClick={() => selecionarReceita(receita)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-[#E7E8D1] transition-colors text-sm"
                    >
                      <Badge className={cnUtil('shrink-0 text-[10px] border', corCat)}>
                        {CATEGORIA_LABELS[receita.categoria as keyof typeof CATEGORIA_LABELS]}
                      </Badge>
                      <span className="flex-1 truncate font-medium text-[#36454F]">{receita.nome}</span>
                      {receita.is_oficial && (
                        <span className="shrink-0 text-[10px] text-[#B85042] font-semibold">★</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharPicker}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Editor de pratos ───────────────────────────────────────────────────────

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {getDiaLabel(dia)} · {REFEICAO_LABELS[refeicao]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Sugestões rápidas PA/Lanche — só quando todos os slots estão vazios */}
          {sugestoesPicker.length > 0 && todosVazios && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Sugestões para {REFEICAO_LABELS[refeicao]}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoesPicker.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => adicionarReceitaDefault(r)}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E7E8D1] text-[#36454F] hover:border-[#2D5016]/40 hover:text-[#2D5016] hover:bg-[#2D5016]/5 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {r.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Slots fixos (Almoço/Jantar) ─────────────────────────────────── */}
          {isSlotFixo ? (
            <div className="space-y-2">
              {pratos.map((prato, idx) => (
                <div
                  key={prato.tempId}
                  className="border border-gray-100 bg-gray-50/60 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      {TIPO_PRATO_LABELS[prato.tipo_prato]}
                    </span>
                    {(prato.receita_id || prato.receita_nome_custom?.trim()) && (
                      <button
                        type="button"
                        onClick={() => clearSlot(idx)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="Limpar slot"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {prato.modo === 'receita' && prato.receita_nome ? (
                    /* Receita selecionada */
                    <button
                      type="button"
                      onClick={() => openPicker(idx)}
                      className="w-full text-left px-3 py-2.5 border border-[#2D5016]/20 bg-[#2D5016]/5 rounded-lg text-sm font-medium text-[#2D5016] truncate"
                    >
                      {prato.receita_nome}
                      {prato.receita_versao_nome && (
                        <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                          ({prato.receita_versao_nome})
                        </span>
                      )}
                    </button>
                  ) : prato.modo === 'custom' ? (
                    /* Modo texto livre */
                    <div className="space-y-1">
                      <Input
                        placeholder={`Nome da ${TIPO_PRATO_LABELS[prato.tipo_prato].toLowerCase()}...`}
                        value={prato.receita_nome_custom ?? ''}
                        onChange={(e) => upd(idx, { receita_nome_custom: e.target.value })}
                        className="text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => { upd(idx, { modo: 'receita', receita_nome_custom: undefined }); openPicker(idx) }}
                        className="text-xs text-[#2D5016] hover:underline"
                      >
                        ou escolher receita
                      </button>
                    </div>
                  ) : (
                    /* Slot vazio — ação principal: escolher receita */
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => openPicker(idx)}
                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-[#2D5016]/40 hover:text-[#2D5016] transition-colors"
                      >
                        + Escolher receita
                      </button>
                      <button
                        type="button"
                        onClick={() => upd(idx, { modo: 'custom' })}
                        className="text-xs text-gray-400 hover:text-gray-600 block w-full text-center"
                      >
                        ou escrever nome livre
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* ── Slots dinâmicos (PA, Lanche, Ceia, Extra) ─────────────────── */
            <>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pratos</Label>
              <div className="space-y-2">
                {pratos.map((prato, idx) => (
                  <div key={prato.tempId} className="flex items-start gap-2">
                    {/* Tipo de prato */}
                    <select
                      value={prato.tipo_prato}
                      onChange={(e) => upd(idx, { tipo_prato: e.target.value as TipoPrato })}
                      className="shrink-0 text-xs border border-[#E7E8D1] rounded-lg px-2 py-2 bg-white text-[#36454F] font-medium focus:outline-none focus:ring-1 focus:ring-[#2D5016]"
                    >
                      {TIPOS_PRATO.map((t) => (
                        <option key={t} value={t}>{TIPO_PRATO_LABELS[t]}</option>
                      ))}
                    </select>

                    {/* Nome / receita */}
                    <div className="flex-1 min-w-0">
                      {prato.modo === 'receita' && prato.receita_nome ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => openPicker(idx)}
                            className="w-full text-left px-3 py-2 border border-[#2D5016] rounded-lg text-sm font-medium text-[#2D5016] bg-[#2D5016]/5 hover:bg-[#2D5016]/10 transition-colors truncate"
                          >
                            {prato.receita_nome}
                          </button>
                          {prato.receita_versao_nome && (
                            <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                              Versão: {prato.receita_versao_nome}
                            </p>
                          )}
                        </div>
                      ) : prato.modo === 'receita' ? (
                        <button
                          type="button"
                          onClick={() => openPicker(idx)}
                          className="w-full text-left px-3 py-2 border border-dashed border-[#E7E8D1] rounded-lg text-sm text-gray-400 hover:border-[#2D5016]/40 hover:text-[#2D5016] transition-colors"
                        >
                          Escolher receita...
                        </button>
                      ) : (
                        <Input
                          placeholder="Nome do prato..."
                          value={prato.receita_nome_custom ?? ''}
                          onChange={(e) => upd(idx, { receita_nome_custom: e.target.value })}
                          className="text-sm"
                        />
                      )}
                    </div>

                    {/* Toggle modo */}
                    <button
                      type="button"
                      onClick={() => {
                        if (prato.modo === 'custom') {
                          upd(idx, { modo: 'receita', receita_nome_custom: undefined })
                          openPicker(idx)
                        } else {
                          upd(idx, { modo: 'custom', receita_id: undefined, receita_nome: undefined, receita_versao_id: undefined, receita_versao_nome: undefined })
                        }
                      }}
                      title={prato.modo === 'custom' ? 'Ligar a receita' : 'Escrever nome livre'}
                      className={cnUtil(
                        'shrink-0 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                        prato.modo === 'receita'
                          ? 'border-[#2D5016]/30 text-[#2D5016] bg-[#2D5016]/5 hover:bg-[#2D5016]/10'
                          : 'border-[#E7E8D1] text-gray-400 hover:border-[#2D5016]/30 hover:text-[#2D5016]'
                      )}
                    >
                      {prato.modo === 'custom' ? 'Receita' : 'Texto'}
                    </button>

                    {/* Remover */}
                    <button
                      type="button"
                      onClick={() => removePrato(idx)}
                      disabled={pratos.length === 1}
                      className="shrink-0 p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-500 disabled:opacity-30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addPrato}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-[#E7E8D1] text-sm text-gray-400 hover:border-[#2D5016] hover:text-[#2D5016] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Adicionar prato
              </button>
            </>
          )}
        </div>

        {/* ── Nº de pessoas ─────────────────────────────────────────────────── */}
        {totalCampo > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Nº de pessoas nesta refeição
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPreset('campo')}
                className={cnUtil(
                  'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                  preset === 'campo'
                    ? 'bg-[#2D5016] text-white border-[#2D5016]'
                    : 'border-[#E7E8D1] text-[#36454F] hover:border-[#2D5016]/40'
                )}
              >
                Todos ({totalCampo})
              </button>
              {numAnimados > 0 && (
                <button
                  type="button"
                  onClick={() => setPreset('animados')}
                  className={cnUtil(
                    'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                    preset === 'animados'
                      ? 'bg-[#2D5016] text-white border-[#2D5016]'
                      : 'border-[#E7E8D1] text-[#36454F] hover:border-[#2D5016]/40'
                  )}
                >
                  Só animados ({numAnimados})
                </button>
              )}
              {numAnimadores > 0 && (
                <button
                  type="button"
                  onClick={() => setPreset('animadores')}
                  className={cnUtil(
                    'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                    preset === 'animadores'
                      ? 'bg-[#2D5016] text-white border-[#2D5016]'
                      : 'border-[#E7E8D1] text-[#36454F] hover:border-[#2D5016]/40'
                  )}
                >
                  Só animadores ({numAnimadores})
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreset('custom')}
                className={cnUtil(
                  'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                  preset === 'custom'
                    ? 'bg-[#2D5016] text-white border-[#2D5016]'
                    : 'border-[#E7E8D1] text-[#36454F] hover:border-[#2D5016]/40'
                )}
              >
                Outro
              </button>
            </div>
            {preset === 'custom' && (
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Animados</p>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={numAnimadosCustom}
                    onChange={(e) => {
                      setNumAnimadosCustom(e.target.value)
                      const a = parseInt(e.target.value) || 0
                      const ad = parseInt(numAnimadoresCustom) || 0
                      setNumPessoas((a + ad) > 0 ? (a + ad) : null)
                    }}
                    placeholder="0"
                    className="w-20 text-sm border border-[#E7E8D1] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2D5016]"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Animadores</p>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={numAnimadoresCustom}
                    onChange={(e) => {
                      setNumAnimadoresCustom(e.target.value)
                      const a = parseInt(numAnimadosCustom) || 0
                      const ad = parseInt(e.target.value) || 0
                      setNumPessoas((a + ad) > 0 ? (a + ad) : null)
                    }}
                    placeholder="0"
                    className="w-20 text-sm border border-[#E7E8D1] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2D5016]"
                  />
                </div>
                {numPessoas !== null && (
                  <p className="text-xs text-gray-400 pb-1.5">= {numPessoas} pessoas</p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {existingPratos.length > 0 && (
            <Button variant="destructive" size="sm" onClick={onRemoveAll} className="gap-1">
              <Trash2 className="h-4 w-4" />
              Remover refeição
            </Button>
          )}
          <Link
            href={`/campo/${campoId}/mamas/lista?gerar_dia=${dia}&gerar_refeicao=${refeicao}`}
            className="flex items-center gap-1.5 text-xs font-medium text-[#2D5016] border border-[#2D5016]/30 rounded-lg px-3 py-2 hover:bg-[#2D5016]/5 transition-colors"
            onClick={onClose}
          >
            🛒 Lista desta refeição
          </Link>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
