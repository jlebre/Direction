'use client'

import { useState } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CampoProduto } from '@/types/mamas'

interface ProdutosViewProps {
  campoId: string
  produtosIniciais: CampoProduto[]
}

const CATEGORIAS = ['Cereais', 'Conservas', 'Bebidas', 'Higiene', 'Limpeza', 'Outro']

export function ProdutosView({ campoId, produtosIniciais }: ProdutosViewProps) {
  const [produtos, setProdutos] = useState<CampoProduto[]>(produtosIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    quantidade: '',
    unidade: '',
    notas: '',
  })
  const supabase = createClient()

  function upd(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function adicionar() {
    if (!form.nome.trim()) {
      toast.error('O nome é obrigatório')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('campo_produtos')
        .insert({
          campo_id: campoId,
          nome: form.nome.trim(),
          categoria: form.categoria.trim(),
          quantidade: form.quantidade !== '' ? parseFloat(form.quantidade) : null,
          unidade: form.unidade.trim(),
          notas: form.notas.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      setProdutos((prev) => [...prev, data as CampoProduto])
      setForm({ nome: '', categoria: '', quantidade: '', unidade: '', notas: '' })
      setModalAberto(false)
      toast.success('Produto adicionado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar')
    } finally {
      setSaving(false)
    }
  }

  async function remover(id: string) {
    await supabase.from('campo_produtos').delete().eq('id', id)
    setProdutos((prev) => prev.filter((p) => p.id !== id))
    toast.success('Removido')
  }

  const porCategoria = CATEGORIAS.map((cat) => ({
    cat,
    items: produtos.filter((p) => p.categoria === cat),
  })).filter((g) => g.items.length > 0)

  const semCategoria = produtos.filter((p) => !p.categoria || !CATEGORIAS.includes(p.categoria))

  const grupos = [
    ...porCategoria,
    ...(semCategoria.length > 0 ? [{ cat: 'Outro', items: semCategoria }] : []),
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{produtos.length} produto{produtos.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setModalAberto(true)} className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
          <Plus className="h-4 w-4" /> Adicionar produto
        </Button>
      </div>

      {produtos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3" />
          <p>Sem produtos registados</p>
          <p className="text-sm mt-1">Adiciona cereais, conservas e outros produtos da despensa.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.cat} className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
              <div className="bg-[#E7E8D1] px-4 py-2 flex items-center justify-between">
                <h3 className="font-bold text-[#36454F] text-sm">{grupo.cat}</h3>
                <Badge variant="secondary" className="text-xs">{grupo.items.length}</Badge>
              </div>
              <div className="divide-y divide-[#E7E8D1]">
                {grupo.items.map((produto, i) => (
                  <div
                    key={produto.id}
                    className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-[#E7E8D1]')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#36454F] truncate">{produto.nome}</p>
                      {produto.notas && (
                        <p className="text-xs text-gray-400 truncate">{produto.notas}</p>
                      )}
                    </div>
                    {produto.quantidade != null && (
                      <span className="text-sm font-bold text-[#2D5016] shrink-0">
                        {produto.quantidade} {produto.unidade}
                      </span>
                    )}
                    <button
                      onClick={() => remover(produto.id)}
                      className="text-gray-300 hover:text-[#F96167] transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Corn Flakes"
                value={form.nome}
                onChange={(e) => upd('nome', e.target.value)}
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
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={form.quantidade}
                  onChange={(e) => upd('quantidade', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input
                  placeholder="kg, L, un, caixa..."
                  value={form.unidade}
                  onChange={(e) => upd('unidade', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Prazo, localização, notas..."
                value={form.notas}
                onChange={(e) => upd('notas', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={adicionar} disabled={saving || !form.nome.trim()} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
