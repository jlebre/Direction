'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, Package, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { IngredienteEmbalagem } from '@/types/mamas'
import { cn } from '@/lib/utils'

interface FormData {
  ingrediente_id: string
  unidade_receita: string
  unidade_compra: string
  quantidade_por_embalagem: string
  regra_arredondamento: 'cima' | 'baixo' | 'proximo'
  notas: string
}

const FORM_VAZIO: FormData = {
  ingrediente_id: '',
  unidade_receita: '',
  unidade_compra: '',
  quantidade_por_embalagem: '',
  regra_arredondamento: 'cima',
  notas: '',
}

const REGRA_LABELS: Record<string, string> = {
  cima: 'Para cima (arredondar sempre para mais)',
  baixo: 'Para baixo',
  proximo: 'Mais próximo',
}

export function EmbalagensConfigView({
  ingredientes,
  embalagensIniciais,
}: {
  ingredientes: { id: string; nome: string }[]
  embalagensIniciais: IngredienteEmbalagem[]
}) {
  const [embalagens, setEmbalagens] = useState<IngredienteEmbalagem[]>(embalagensIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState<{ id: string; nome: string } | null>(null)
  const [pesquisa, setPesquisa] = useState('')
  const [ingSearch, setIngSearch] = useState('')
  const supabase = createClient()

  const ingFiltrados = useMemo(() => {
    const q = ingSearch.trim().toLowerCase()
    if (!q) return []
    return ingredientes.filter((i) => i.nome.toLowerCase().includes(q)).slice(0, 30)
  }, [ingredientes, ingSearch])

  const embalagensVisiveis = useMemo(() => {
    if (!pesquisa.trim()) return embalagens
    const q = pesquisa.toLowerCase()
    return embalagens.filter((e) =>
      e.ingrediente?.nome?.toLowerCase().includes(q) ||
      e.unidade_receita.toLowerCase().includes(q) ||
      e.unidade_compra.toLowerCase().includes(q)
    )
  }, [embalagens, pesquisa])

  function abrirNova() {
    setForm(FORM_VAZIO)
    setIngSearch('')
    setEditId(null)
    setModalAberto(true)
  }

  function abrirEditar(e: IngredienteEmbalagem) {
    setForm({
      ingrediente_id: e.ingrediente_id,
      unidade_receita: e.unidade_receita,
      unidade_compra: e.unidade_compra,
      quantidade_por_embalagem: String(e.quantidade_por_embalagem),
      regra_arredondamento: e.regra_arredondamento,
      notas: e.notas ?? '',
    })
    setIngSearch(e.ingrediente?.nome ?? '')
    setEditId(e.id)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setTimeout(() => { setForm(FORM_VAZIO); setEditId(null); setIngSearch('') }, 200)
  }

  function ingSelecionado() {
    return ingredientes.find((i) => i.id === form.ingrediente_id)
  }

  async function guardar() {
    if (!form.ingrediente_id || !form.unidade_receita.trim() || !form.unidade_compra.trim()) return
    const qty = parseFloat(form.quantidade_por_embalagem)
    if (!qty || qty <= 0) { toast.error('Quantidade por embalagem inválida'); return }

    setSaving(true)
    const payload = {
      ingrediente_id: form.ingrediente_id,
      unidade_receita: form.unidade_receita.trim().toLowerCase(),
      unidade_compra: form.unidade_compra.trim(),
      quantidade_por_embalagem: qty,
      regra_arredondamento: form.regra_arredondamento,
      notas: form.notas.trim() || null,
    }

    try {
      const ing = ingSelecionado()
      if (editId) {
        const { data: updated, error } = await supabase
          .from('ingrediente_embalagens')
          .update(payload)
          .eq('id', editId)
          .select('*')
          .single()
        if (error) throw error
        const withIng = { ...updated, ingrediente: ing ? { id: ing.id, nome: ing.nome } : undefined } as IngredienteEmbalagem
        setEmbalagens((prev) => prev.map((e) => e.id === editId ? withIng : e))
        toast.success('Guardado')
      } else {
        const { data: nova, error } = await supabase
          .from('ingrediente_embalagens')
          .insert(payload)
          .select('*')
          .single()
        if (error) throw error
        const withIng = { ...nova, ingrediente: ing ? { id: ing.id, nome: ing.nome } : undefined } as IngredienteEmbalagem
        setEmbalagens((prev) => [...prev, withIng])
        toast.success('Configuração adicionada')
      }
      fecharModal()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao guardar'
      // UNIQUE constraint violation: already exists
      if (msg.includes('unique') || msg.includes('duplicate')) {
        toast.error('Já existe uma regra para este ingrediente nessa unidade de receita')
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  async function apagarConfirmado() {
    if (!confirmarApagar) return
    const { error } = await supabase.from('ingrediente_embalagens').delete().eq('id', confirmarApagar.id)
    if (error) { toast.error('Erro ao remover'); return }
    setEmbalagens((prev) => prev.filter((e) => e.id !== confirmarApagar.id))
    toast.success('Removido')
    setConfirmarApagar(null)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar ingrediente ou unidade..."
            className="pl-8"
          />
        </div>
        <Button type="button" onClick={abrirNova} size="sm" className="gap-1 shrink-0">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {embalagensVisiveis.length === 0 ? (
        <div className="text-center py-12 text-gray-400 space-y-3">
          <Package className="h-12 w-12 mx-auto" />
          <p className="font-medium">Sem conversões configuradas</p>
          <p className="text-sm max-w-xs mx-auto">
            Configura aqui como converter unidades de receita (ex: cubos) em unidades de compra (ex: pacote de 12).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {embalagensVisiveis.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border border-[#E7E8D1] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#36454F] text-sm truncate">
                    {e.ingrediente?.nome ?? e.ingrediente_id}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    <span className="font-medium">{e.unidade_receita}</span>
                    <span className="text-gray-400 mx-1.5">→</span>
                    <span className="font-medium">{e.unidade_compra}</span>
                    <span className="text-gray-400 ml-1.5">
                      ({e.quantidade_por_embalagem} {e.unidade_receita}/{e.unidade_compra})
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Arredondar: {REGRA_LABELS[e.regra_arredondamento] ?? e.regra_arredondamento}
                    {e.notas && <span className="ml-1.5 italic">· {e.notas}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => abrirEditar(e)}
                    className="text-xs text-gray-400 hover:text-[#2D5016] transition-colors min-h-[44px] px-2 flex items-center"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarApagar({ id: e.id, nome: e.ingrediente?.nome ?? e.ingrediente_id })}
                    className="text-[#F96167] hover:opacity-70 transition-opacity min-h-[44px] px-1 flex items-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal adicionar / editar */}
      <Dialog open={modalAberto} onOpenChange={(open) => { if (!open) fecharModal() }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar conversão' : 'Nova conversão de embalagem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto">

            {/* Ingrediente picker */}
            <div className="space-y-2">
              <Label>Ingrediente *</Label>
              {form.ingrediente_id && ingSelecionado() && (
                <div className="flex items-center gap-2 bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm font-medium text-[#2D5016]">{ingSelecionado()?.nome}</span>
                  {!editId && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, ingrediente_id: '' }))}
                      className="text-gray-400 hover:text-red-400 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              {!form.ingrediente_id && (
                <>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input
                      placeholder="Pesquisar ingrediente..."
                      value={ingSearch}
                      onChange={(e) => setIngSearch(e.target.value)}
                      className="pl-7 text-sm"
                    />
                  </div>
                  {ingSearch.trim() && (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {ingFiltrados.length === 0 ? (
                        <p className="text-xs text-gray-400">Nenhum ingrediente encontrado</p>
                      ) : ingFiltrados.map((ing) => (
                        <button
                          key={ing.id}
                          type="button"
                          onClick={() => { setForm((f) => ({ ...f, ingrediente_id: ing.id })); setIngSearch(ing.nome) }}
                          className="text-xs px-2.5 py-1 rounded-full border font-medium bg-white text-gray-600 border-gray-200 hover:border-[#2D5016]/40 hover:text-[#2D5016] transition-colors"
                        >
                          {ing.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="un_receita">Unidade de receita *</Label>
                <Input
                  id="un_receita"
                  placeholder="cubo, dente, ml..."
                  value={form.unidade_receita}
                  onChange={(e) => setForm((f) => ({ ...f, unidade_receita: e.target.value }))}
                  disabled={!!editId}
                />
                {editId && <p className="text-[10px] text-gray-400">Não editável (chave única)</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="un_compra">Unidade de compra *</Label>
                <Input
                  id="un_compra"
                  placeholder="pacote, cabeça..."
                  value={form.unidade_compra}
                  onChange={(e) => setForm((f) => ({ ...f, unidade_compra: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="qtd_emb">
                Quantidade de receita por embalagem *
                <span className="text-gray-400 font-normal text-xs ml-1">
                  ex: 12 (cubos por pacote)
                </span>
              </Label>
              <Input
                id="qtd_emb"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="12"
                value={form.quantidade_por_embalagem}
                onChange={(e) => setForm((f) => ({ ...f, quantidade_por_embalagem: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Regra de arredondamento</Label>
              <Select
                value={form.regra_arredondamento}
                onValueChange={(v) => setForm((f) => ({ ...f, regra_arredondamento: v as 'cima' | 'baixo' | 'proximo' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cima">Para cima (recomendado)</SelectItem>
                  <SelectItem value="proximo">Mais próximo</SelectItem>
                  <SelectItem value="baixo">Para baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notas">Notas</Label>
              <Input
                id="notas"
                placeholder="ex: Knorr, 12 cubos por caixa"
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fecharModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={guardar}
              disabled={saving || !form.ingrediente_id || !form.unidade_receita.trim() || !form.unidade_compra.trim() || !form.quantidade_por_embalagem}
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de apagar */}
      <Dialog open={!!confirmarApagar} onOpenChange={(open) => { if (!open) setConfirmarApagar(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover configuração</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Remover a conversão de embalagem para <strong>{confirmarApagar?.nome}</strong>?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarApagar(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={apagarConfirmado}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
