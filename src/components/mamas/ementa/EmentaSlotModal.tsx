'use client'

import { useState, useMemo } from 'react'
import { Search, Trash2, ChevronDown, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  REFEICAO_LABELS,
  CATEGORIA_LABELS,
  CATEGORIA_CORES,
} from '@/types/mamas'

interface EmentaSlotModalProps {
  dia: number
  refeicao: RefeicaoTipo
  slotAtual?: EmentaItem
  receitas: unknown[]
  onSave: (dados: {
    receita_id?: string
    receita_nome_custom?: string
    responsavel?: string
    notas?: string
  }) => Promise<void>
  onRemove: () => void
  onClose: () => void
}

export function EmentaSlotModal({
  dia,
  refeicao,
  slotAtual,
  receitas,
  onSave,
  onRemove,
  onClose,
}: EmentaSlotModalProps) {
  const [pesquisa, setPesquisa] = useState('')
  const [receitaSelecionada, setReceitaSelecionada] = useState<string | undefined>(
    slotAtual?.receita_id
  )
  const [nomeCustom, setNomeCustom] = useState(slotAtual?.receita_nome_custom ?? '')
  const [responsavel, setResponsavel] = useState(slotAtual?.responsavel ?? '')
  const [notas, setNotas] = useState(slotAtual?.notas ?? '')
  const [saving, setSaving] = useState(false)
  const [modoCustom, setModoCustom] = useState(!slotAtual?.receita_id && !!slotAtual?.receita_nome_custom)

  const receitasFiltradas = useMemo(() => {
    const q = pesquisa.toLowerCase()
    return (receitas as { id: string; nome: string; categoria: string; tags: string[]; is_oficial: boolean }[]).filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        CATEGORIA_LABELS[r.categoria as keyof typeof CATEGORIA_LABELS]?.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }, [receitas, pesquisa])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        receita_id: modoCustom ? undefined : receitaSelecionada,
        receita_nome_custom: modoCustom ? nomeCustom : undefined,
        responsavel: responsavel || undefined,
        notas: notas || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const canSave = modoCustom ? !!nomeCustom : !!receitaSelecionada

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {getDiaLabel(dia)} · {REFEICAO_LABELS[refeicao]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle custom */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModoCustom(false)}
              className={cnUtil(
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                !modoCustom
                  ? 'bg-[#B85042] text-white border-[#B85042]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              Escolher receita
            </button>
            <button
              type="button"
              onClick={() => setModoCustom(true)}
              className={cnUtil(
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                modoCustom
                  ? 'bg-[#B85042] text-white border-[#B85042]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              Nome personalizado
            </button>
          </div>

          {modoCustom ? (
            <div className="space-y-2">
              <Label>Nome do prato</Label>
              <Input
                placeholder="Ex: Almoço partilhado, Piquenique..."
                value={nomeCustom}
                onChange={(e) => setNomeCustom(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Pesquisar receita..."
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg border border-gray-200 p-1">
                {receitasFiltradas.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhuma receita encontrada</p>
                ) : (
                  receitasFiltradas.map((receita) => {
                    const corCat = CATEGORIA_CORES[receita.categoria as keyof typeof CATEGORIA_CORES]
                    const isSelected = receitaSelecionada === receita.id
                    return (
                      <button
                        key={receita.id}
                        type="button"
                        onClick={() => setReceitaSelecionada(receita.id)}
                        className={cnUtil(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors text-sm',
                          isSelected
                            ? 'bg-[#B85042] text-white'
                            : 'hover:bg-[#E7E8D1]'
                        )}
                      >
                        <Badge className={cnUtil('shrink-0 text-[10px] border', isSelected ? 'bg-white/20 text-white border-white/30' : corCat)}>
                          {CATEGORIA_LABELS[receita.categoria as keyof typeof CATEGORIA_LABELS]}
                        </Badge>
                        <span className="flex-1 truncate font-medium">{receita.nome}</span>
                        {receita.is_oficial && (
                          <Star className={cnUtil('h-3.5 w-3.5 shrink-0', isSelected ? 'text-white/70' : 'text-[#B85042]')} fill="currentColor" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Input
                placeholder="Mamã Mema, Tia..."
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Fazer mousse de manhã..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {slotAtual && (
            <Button variant="destructive" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
