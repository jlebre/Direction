'use client'

import { useState, useMemo } from 'react'
import { Search, Trash2, Plus, X, Star } from 'lucide-react'
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

// Item em edição dentro do modal
interface PratoEdit {
  tempId: string
  tipo_prato: TipoPrato
  // modo receita vs custom
  modo: 'receita' | 'custom'
  receita_id?: string
  receita_nome?: string       // nome para display quando ligado a receita
  receita_nome_custom?: string
  notas?: string
}

function gerarTempId() {
  return Math.random().toString(36).slice(2)
}

function fromExisting(items: EmentaItem[]): PratoEdit[] {
  if (items.length === 0) {
    return [{ tempId: gerarTempId(), tipo_prato: 'prato', modo: 'custom', receita_nome_custom: '' }]
  }
  return items.map((item) => ({
    tempId: gerarTempId(),
    tipo_prato: item.tipo_prato ?? 'prato',
    modo: item.receita_id ? 'receita' : 'custom',
    receita_id: item.receita_id,
    receita_nome: (item.receita as { nome?: string } | undefined)?.nome,
    receita_nome_custom: item.receita_nome_custom,
    notas: item.notas,
  }))
}

const TIPOS_PRATO: TipoPrato[] = ['sopa', 'prato', 'sobremesa', 'extra', 'bebida', 'outro']

interface EmentaSlotModalProps {
  dia: number
  refeicao: RefeicaoTipo
  existingPratos: EmentaItem[]
  receitas: unknown[]
  onSave: (pratos: { tipo_prato: TipoPrato; receita_id?: string; receita_nome_custom?: string; notas?: string }[]) => Promise<void>
  onRemoveAll: () => void
  onClose: () => void
}

export function EmentaSlotModal({
  dia,
  refeicao,
  existingPratos,
  receitas,
  onSave,
  onRemoveAll,
  onClose,
}: EmentaSlotModalProps) {
  const [pratos, setPratos] = useState<PratoEdit[]>(() => fromExisting(existingPratos))
  const [pickerIdx, setPickerIdx] = useState<number | null>(null)
  const [pesquisa, setPesquisa] = useState('')
  const [saving, setSaving] = useState(false)
  const [criando, setCriando] = useState(false)
  const supabase = createClient()

  const receitasFiltradas = useMemo(() => {
    const q = pesquisa.toLowerCase()
    return (receitas as { id: string; nome: string; categoria: string; tags: string[]; is_oficial: boolean }[]).filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        CATEGORIA_LABELS[r.categoria as keyof typeof CATEGORIA_LABELS]?.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }, [receitas, pesquisa])

  function upd(idx: number, patch: Partial<PratoEdit>) {
    setPratos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function addPrato() {
    setPratos((prev) => [...prev, { tempId: gerarTempId(), tipo_prato: 'prato', modo: 'custom', receita_nome_custom: '' }])
  }

  function removePrato(idx: number) {
    setPratos((prev) => prev.filter((_, i) => i !== idx))
  }

  function openPicker(idx: number) {
    setPesquisa('')
    setPickerIdx(idx)
  }

  async function criarRascunho(nome: string) {
    setCriando(true)
    try {
      const { data, error } = await supabase
        .from('receitas')
        .insert({ nome, categoria: 'outro', is_oficial: false })
        .select('id, nome')
        .single()
      if (error) throw error
      pickReceita({ id: data.id, nome: data.nome })
      toast.success(`Receita "${nome}" criada — podes preencher os detalhes depois`)
    } catch {
      toast.error('Erro ao criar receita')
    } finally {
      setCriando(false)
    }
  }

  function pickReceita(receita: { id: string; nome: string }) {
    if (pickerIdx === null) return
    upd(pickerIdx, { modo: 'receita', receita_id: receita.id, receita_nome: receita.nome })
    setPickerIdx(null)
  }

  async function handleSave() {
    const valid = pratos.filter((p) => {
      if (p.modo === 'receita') return !!p.receita_id
      return !!(p.receita_nome_custom?.trim())
    })
    if (valid.length === 0) return

    setSaving(true)
    try {
      await onSave(
        valid.map((p) => ({
          tipo_prato: p.tipo_prato,
          receita_id: p.modo === 'receita' ? p.receita_id : undefined,
          receita_nome_custom: p.modo === 'custom' ? (p.receita_nome_custom?.trim() || undefined) : undefined,
          notas: p.notas?.trim() || undefined,
        }))
      )
    } finally {
      setSaving(false)
    }
  }

  const canSave = pratos.some((p) =>
    p.modo === 'receita' ? !!p.receita_id : !!(p.receita_nome_custom?.trim())
  )

  // ── Picker de receitas (sobrepõe a lista de pratos) ───────────────────────
  if (pickerIdx !== null) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerIdx(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
              Escolher receita
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
                </div>
              ) : (
                receitasFiltradas.map((receita) => {
                  const corCat = CATEGORIA_CORES[receita.categoria as keyof typeof CATEGORIA_CORES]
                  return (
                    <button
                      key={receita.id}
                      type="button"
                      onClick={() => pickReceita(receita)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-[#E7E8D1] transition-colors text-sm"
                    >
                      <Badge className={cnUtil('shrink-0 text-[10px] border', corCat)}>
                        {CATEGORIA_LABELS[receita.categoria as keyof typeof CATEGORIA_LABELS]}
                      </Badge>
                      <span className="flex-1 truncate font-medium text-[#36454F]">{receita.nome}</span>
                      {receita.is_oficial && (
                        <Star className="h-3.5 w-3.5 shrink-0 text-[#B85042]" fill="currentColor" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerIdx(null)}>Cancelar</Button>
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
                  {prato.modo === 'receita' ? (
                    <button
                      type="button"
                      onClick={() => openPicker(idx)}
                      className="w-full text-left px-3 py-2 border border-[#2D5016] rounded-lg text-sm font-medium text-[#2D5016] bg-[#2D5016]/5 hover:bg-[#2D5016]/10 transition-colors truncate"
                    >
                      {prato.receita_nome || 'Escolher receita...'}
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
                      openPicker(idx)
                      upd(idx, { modo: 'receita' })
                    } else {
                      upd(idx, { modo: 'custom', receita_id: undefined, receita_nome: undefined })
                    }
                  }}
                  title={prato.modo === 'custom' ? 'Ligar a receita' : 'Escrever nome'}
                  className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#2D5016]"
                >
                  <Star className="h-4 w-4" />
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
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {existingPratos.length > 0 && (
            <Button variant="destructive" size="sm" onClick={onRemoveAll} className="gap-1">
              <Trash2 className="h-4 w-4" />
              Remover refeição
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
