'use client'

import { useState } from 'react'
import { Plus, Trash2, DollarSign, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn, formatCurrency, parseMoney } from '@/lib/utils'
import type { CampoPreco } from '@/types/mamas'

interface PrecosViewProps {
  campoId: string
  precosIniciais: CampoPreco[]
  precosReferencia?: CampoPreco[]
}

const CATEGORIAS = ['Talho', 'Peixaria', 'Padaria', 'Frutas/Legumes', 'Despensa', 'Laticínios', 'Outro']

export function PrecosView({ campoId, precosIniciais, precosReferencia = [] }: PrecosViewProps) {
  const [precos, setPrecos] = useState<CampoPreco[]>(precosIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    item: '',
    categoria: '',
    preco: '',
    unidade: '',
    fornecedor: '',
    notas: '',
  })
  const supabase = createClient()

  function upd(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function adicionar() {
    if (!form.item.trim()) {
      toast.error('O item é obrigatório')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('campo_precos')
        .insert({
          campo_id: campoId,
          item: form.item.trim(),
          categoria: form.categoria.trim(),
          preco: form.preco !== '' ? (parseMoney(form.preco) ?? null) : null,
          unidade: form.unidade.trim(),
          fornecedor: form.fornecedor.trim(),
          notas: form.notas.trim() || null,
        })
        .select('*, campo:campos(nome)')
        .single()
      if (error) throw error
      setPrecos((prev) => [...prev, data as CampoPreco])
      setForm({ item: '', categoria: '', preco: '', unidade: '', fornecedor: '', notas: '' })
      setModalAberto(false)
      toast.success('Preço adicionado e partilhado com todos os campos')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar')
    } finally {
      setSaving(false)
    }
  }

  async function remover(id: string) {
    await supabase.from('campo_precos').delete().eq('id', id)
    setPrecos((prev) => prev.filter((p) => p.id !== id))
    toast.success('Removido')
  }

  function buildGrupos(lista: CampoPreco[]) {
    const porCat = CATEGORIAS.map((cat) => ({
      cat,
      items: lista.filter((p) => p.categoria === cat),
    })).filter((g) => g.items.length > 0)
    const semCat = lista.filter((p) => !p.categoria || !CATEGORIAS.includes(p.categoria))
    return [...porCat, ...(semCat.length > 0 ? [{ cat: 'Outro', items: semCat }] : [])]
  }

  const grupos = buildGrupos(precos)
  const gruposRef = buildGrupos(precosReferencia)

  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="todos">
        <TabsList className="w-full">
          <TabsTrigger value="todos" className="flex-1">Todos os campos</TabsTrigger>
          <TabsTrigger value="referencia" className="flex-1">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            Referência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{precos.length} referência{precos.length !== 1 ? 's' : ''} partilhadas</p>
            <Button size="sm" onClick={() => setModalAberto(true)} className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
              <Plus className="h-4 w-4" /> Adicionar preço
            </Button>
          </div>

          <p className="text-xs text-gray-400 -mt-1">
            Os preços adicionados aqui são visíveis por todos os campos.
          </p>

          {precos.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <DollarSign className="h-12 w-12 mx-auto mb-3" />
              <p>Sem preços registados</p>
              <p className="text-sm mt-1">Sê o primeiro a adicionar referências de preços!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grupos.map((grupo) => (
                <PrecoGrupo
                  key={grupo.cat}
                  cat={grupo.cat}
                  items={grupo.items}
                  campoId={campoId}
                  onRemover={remover}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="referencia" className="space-y-4 mt-4">
          <p className="text-sm text-gray-500">
            Preços recolhidos no Continente / Pingo Doce — Julho 2023. Usa como referência para orçamentar.
          </p>
          {gruposRef.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3" />
              <p>Sem preços de referência carregados</p>
              <p className="text-sm mt-1">Corre o seed_precos_referencia.sql no Supabase.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gruposRef.map((grupo) => (
                <PrecoGrupo key={grupo.cat} cat={grupo.cat} items={grupo.items} campoId={campoId} readonly />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar referência de preço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Item</Label>
              <Input
                placeholder="Ex: Frango inteiro"
                value={form.item}
                onChange={(e) => upd('item', e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => upd('categoria', cat)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      form.categoria === cat
                        ? 'bg-[#2D5016] text-white border-[#2D5016]'
                        : 'text-gray-600 border-gray-300 hover:border-[#2D5016]'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Preço (€)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="pl-7"
                    placeholder="0,00"
                    value={form.preco}
                    onChange={(e) => upd('preco', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input
                  placeholder="kg, L, un..."
                  value={form.unidade}
                  onChange={(e) => upd('unidade', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fornecedor / Loja</Label>
              <Input
                placeholder="Pingo Doce, Talho local..."
                value={form.fornecedor}
                onChange={(e) => upd('fornecedor', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Qualidade, prazo, notas..."
                value={form.notas}
                onChange={(e) => upd('notas', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={adicionar} disabled={saving || !form.item.trim()} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PrecoGrupo({
  cat,
  items,
  campoId,
  onRemover,
  readonly = false,
}: {
  cat: string
  items: CampoPreco[]
  campoId: string
  onRemover?: (id: string) => void
  readonly?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
      <div className="bg-[#E7E8D1] px-4 py-2 flex items-center justify-between">
        <h3 className="font-bold text-[#36454F] text-sm">{cat}</h3>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>
      <div className="divide-y divide-[#E7E8D1]">
        {items.map((preco) => (
          <div key={preco.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#36454F] truncate">{preco.item}</p>
              {preco.fornecedor && (
                <p className="text-xs text-gray-400 truncate">{preco.fornecedor}</p>
              )}
              {preco.notas && (
                <p className="text-xs text-gray-400 italic truncate">{preco.notas}</p>
              )}
              {preco.campo?.nome && (
                <p className="text-[10px] text-gray-300 truncate mt-0.5">{preco.campo.nome}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {preco.preco != null && (
                <p className="text-sm font-bold text-[#2D5016]">{formatCurrency(preco.preco)}</p>
              )}
              {preco.unidade && (
                <p className="text-xs text-gray-400">/{preco.unidade}</p>
              )}
            </div>
            {!readonly && onRemover && preco.campo_id === campoId && (
              <button
                onClick={() => onRemover(preco.id)}
                className="text-gray-300 hover:text-[#F96167] transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {!readonly && onRemover && preco.campo_id !== campoId && (
              <div className="w-4 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
