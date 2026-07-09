'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Star, Pencil, Trash2, Plus, X, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IngredientesTable } from '@/components/mamas/receitas/IngredientesTable'
import { CATEGORIA_LABELS, CATEGORIA_CORES } from '@/types/mamas'
import type { Receita, ReceitaIngrediente, CategoriaReceita } from '@/types/mamas'
import type { Campo, SeccaoTipo } from '@/types/shared'
import { cn } from '@/lib/utils'

interface Props {
  receita: Receita & { ingredientes: ReceitaIngrediente[] }
  campo: Campo
}

const UNIDADES = ['g', 'kg', 'ml', 'L', 'un', 'dl', 'colher', 'chávena', 'lata', 'pacote', 'fatia', 'dente']

export function ReceitaDetail({ receita, campo }: Props) {
  const [modo, setModo] = useState<'ver' | 'editar'>('ver')
  const [showWarnOficial, setShowWarnOficial] = useState(false)
  const [saving, setSaving] = useState(false)
  const [forking, setForking] = useState(false)
  const [form, setForm] = useState({
    nome: receita.nome,
    categoria: receita.categoria,
    descricao: receita.descricao ?? '',
    instrucoes: receita.instrucoes ?? '',
    dicas_campo: receita.dicas_campo ?? '',
    tags: receita.tags?.join(', ') ?? '',
  })
  const [ingredientes, setIngredientes] = useState<ReceitaIngrediente[]>(receita.ingredientes ?? [])
  const [novoIng, setNovoIng] = useState({
    nome: '', unidade: 'g', notas: '',
    qtd_mosquitos: '', qtd_aranh_melgas: '', qtd_cam_trem: '',
  })
  const [addingIng, setAddingIng] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const campoId = campo.id

  const corCat = CATEGORIA_CORES[form.categoria]

  function iniciarEditar() {
    if (receita.is_oficial) { setShowWarnOficial(true); return }
    setModo('editar')
  }

  async function guardar() {
    setSaving(true)
    try {
      const { error } = await supabase.from('receitas').update({
        nome: form.nome.trim(),
        categoria: form.categoria,
        descricao: form.descricao.trim() || null,
        instrucoes: form.instrucoes.trim() || null,
        dicas_campo: form.dicas_campo.trim() || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }).eq('id', receita.id)
      if (error) throw error
      toast.success('Receita guardada!')
      setModo('ver')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function removerIngrediente(id: string) {
    const { error } = await supabase.from('receita_ingredientes').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setIngredientes((prev) => prev.filter((i) => i.id !== id))
  }

  async function adicionarIngrediente() {
    const nome = novoIng.nome.trim()
    if (!nome) return
    setAddingIng(true)
    try {
      let ingredienteId: string
      const { data: existing } = await supabase
        .from('ingredientes').select('id').ilike('nome', nome).maybeSingle()
      if (existing) {
        ingredienteId = existing.id
      } else {
        const { data: novo, error } = await supabase.from('ingredientes').insert({
          nome,
          categoria_supermercado: 'outro',
          unidade_base: novoIng.unidade,
          tipo_armazenamento: 'despensa',
          tipo_produto: 'outro',
        }).select('id').single()
        if (error || !novo) throw error
        ingredienteId = novo.id
      }
      const { data: criado, error: errI } = await supabase
        .from('receita_ingredientes')
        .insert({
          receita_id: receita.id,
          ingrediente_id: ingredienteId,
          quantidade_mosquitos: parseFloat(novoIng.qtd_mosquitos) || null,
          quantidade_aranh_melgas: parseFloat(novoIng.qtd_aranh_melgas) || null,
          quantidade_cam_trem: parseFloat(novoIng.qtd_cam_trem) || null,
          unidade: novoIng.unidade,
          notas: novoIng.notas.trim() || null,
        })
        .select('*, ingrediente:ingredientes(*)')
        .single()
      if (errI || !criado) throw errI
      setIngredientes((prev) => [...prev, criado as ReceitaIngrediente])
      setNovoIng({ nome: '', unidade: 'g', notas: '', qtd_mosquitos: '', qtd_aranh_melgas: '', qtd_cam_trem: '' })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar ingrediente')
    } finally {
      setAddingIng(false)
    }
  }

  async function criarNovaVersao() {
    setForking(true)
    try {
      const { data: novaReceita, error: errR } = await supabase
        .from('receitas')
        .insert({
          nome: `${receita.nome} (versão campo)`,
          categoria: receita.categoria,
          descricao: receita.descricao ?? null,
          instrucoes: receita.instrucoes ?? null,
          dicas_campo: receita.dicas_campo ?? null,
          tags: receita.tags ?? [],
          pessoas_base: receita.pessoas_base,
          is_oficial: false,
        })
        .select('id')
        .single()
      if (errR || !novaReceita) throw errR
      if (ingredientes.length > 0) {
        const { error: errI } = await supabase.from('receita_ingredientes').insert(
          ingredientes.map((i) => ({
            receita_id: novaReceita.id,
            ingrediente_id: i.ingrediente_id,
            quantidade_mosquitos: i.quantidade_mosquitos,
            quantidade_aranh_melgas: i.quantidade_aranh_melgas,
            quantidade_cam_trem: i.quantidade_cam_trem,
            unidade: i.unidade,
            notas: i.notas,
          }))
        )
        if (errI) throw errI
      }
      toast.success('Nova versão criada!')
      setShowWarnOficial(false)
      router.push(`/campo/${campoId}/mamas/receitas/${novaReceita.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar versão')
    } finally {
      setForking(false)
    }
  }

  const totalPessoas = (campo.num_animados ?? 0) + (campo.num_animadores ?? 0)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-10">
      {/* ── Aviso receita oficial ── */}
      {showWarnOficial && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Esta é uma receita oficial</p>
              <p className="text-amber-700 text-xs mt-0.5">
                As receitas do Livrinho da Mamã não podem ser editadas diretamente. Podes criar uma versão personalizada para este campo.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={criarNovaVersao}
              disabled={forking}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white text-xs"
            >
              {forking ? 'A criar...' : '+ Criar versão para este campo'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowWarnOficial(false)} className="text-xs">
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* ── Cabeçalho: badges + botão editar ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {modo === 'ver' ? (
            <Badge className={cn('border', corCat)}>{CATEGORIA_LABELS[form.categoria]}</Badge>
          ) : null}
          {receita.is_oficial && (
            <Badge className="bg-amber-50 text-amber-800 border-amber-300 gap-1">
              <Star className="h-3 w-3" fill="currentColor" />
              Livrinho da Mamã
            </Badge>
          )}
          {modo === 'ver' && form.tags && form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">#{tag}</span>
          ))}
        </div>
        {modo === 'ver' && (
          <button
            onClick={iniciarEditar}
            className="flex items-center gap-1.5 text-xs font-medium text-[#2D5016] bg-[#2D5016]/10 hover:bg-[#2D5016]/20 rounded-lg px-3 py-1.5 transition-colors shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        )}
      </div>

      {/* ── Vista ── */}
      {modo === 'ver' && (
        <>
          {receita.descricao && (
            <p className="text-gray-600 text-sm">{receita.descricao}</p>
          )}
          {ingredientes.length > 0 && (
            <div>
              <h2 className="font-bold text-[#36454F] mb-3">Ingredientes</h2>
              <IngredientesTable
                ingredientes={ingredientes.map((ri) => ({
                  id: ri.id,
                  quantidade_mosquitos: ri.quantidade_mosquitos ?? 0,
                  quantidade_aranh_melgas: ri.quantidade_aranh_melgas ?? 0,
                  quantidade_cam_trem: ri.quantidade_cam_trem ?? 0,
                  unidade: ri.unidade,
                  notas: ri.notas,
                  ingrediente: ri.ingrediente ? { nome: ri.ingrediente.nome } : undefined,
                }))}
                seccao={(campo.seccao ?? 'aranhicos') as SeccaoTipo}
                totalPessoas={totalPessoas}
              />
            </div>
          )}
          {receita.instrucoes && (
            <div>
              <h2 className="font-bold text-[#36454F] mb-2">Instruções</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{receita.instrucoes}</p>
            </div>
          )}
          {receita.dicas_campo && (
            <div className="bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-xl p-4">
              <p className="font-semibold text-[#2D5016] text-sm mb-1">Dica para o campo</p>
              <p className="text-sm text-gray-600">{receita.dicas_campo}</p>
            </div>
          )}
        </>
      )}

      {/* ── Modo editar ── */}
      {modo === 'editar' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v as CategoriaReceita }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORIA_LABELS) as [CategoriaReceita, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Instruções</Label>
            <Textarea rows={5} value={form.instrucoes} onChange={(e) => setForm((f) => ({ ...f, instrucoes: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Dica para o campo</Label>
            <Textarea rows={2} value={form.dicas_campo} onChange={(e) => setForm((f) => ({ ...f, dicas_campo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="vegetariano, rápido" />
          </div>

          {/* Ingredientes */}
          <div className="space-y-2">
            <Label>Ingredientes</Label>
            {ingredientes.length > 0 && (
              <div className="border border-[#E7E8D1] rounded-xl overflow-hidden divide-y divide-[#E7E8D1]">
                {ingredientes.map((ing) => (
                  <div key={ing.id} className="flex items-center gap-2 px-3 py-2 bg-white">
                    <span className="flex-1 text-sm text-[#36454F]">
                      {ing.ingrediente?.nome ?? '—'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {[
                        ing.quantidade_mosquitos && `${ing.quantidade_mosquitos}${ing.unidade}`,
                        ing.quantidade_aranh_melgas && `${ing.quantidade_aranh_melgas}${ing.unidade}`,
                        ing.quantidade_cam_trem && `${ing.quantidade_cam_trem}${ing.unidade}`,
                      ].filter(Boolean).join(' / ') || ing.unidade}
                    </span>
                    <button
                      onClick={() => removerIngrediente(ing.id)}
                      className="text-gray-300 hover:text-[#B85042] transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add ingredient form */}
            <div className="border border-dashed border-[#E7E8D1] rounded-xl p-3 space-y-2 bg-[#f8f9f4]">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />Adicionar ingrediente
              </p>
              <Input
                placeholder="Nome do ingrediente"
                value={novoIng.nome}
                onChange={(e) => setNovoIng((n) => ({ ...n, nome: e.target.value }))}
                className="text-sm"
              />
              <div className="grid grid-cols-4 gap-1.5">
                <Input
                  placeholder="Mosquitos"
                  type="number"
                  value={novoIng.qtd_mosquitos}
                  onChange={(e) => setNovoIng((n) => ({ ...n, qtd_mosquitos: e.target.value }))}
                  className="text-xs"
                />
                <Input
                  placeholder="Aranh/Mel"
                  type="number"
                  value={novoIng.qtd_aranh_melgas}
                  onChange={(e) => setNovoIng((n) => ({ ...n, qtd_aranh_melgas: e.target.value }))}
                  className="text-xs"
                />
                <Input
                  placeholder="Cam/Trem"
                  type="number"
                  value={novoIng.qtd_cam_trem}
                  onChange={(e) => setNovoIng((n) => ({ ...n, qtd_cam_trem: e.target.value }))}
                  className="text-xs"
                />
                <Select value={novoIng.unidade} onValueChange={(v) => setNovoIng((n) => ({ ...n, unidade: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Notas (opcional)"
                value={novoIng.notas}
                onChange={(e) => setNovoIng((n) => ({ ...n, notas: e.target.value }))}
                className="text-sm"
              />
              <button
                onClick={adicionarIngrediente}
                disabled={!novoIng.nome.trim() || addingIng}
                className="text-xs font-medium text-[#2D5016] bg-[#2D5016]/10 hover:bg-[#2D5016]/20 disabled:opacity-40 rounded-lg px-3 py-1.5 transition-colors"
              >
                {addingIng ? 'A adicionar...' : '+ Adicionar'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={guardar}
              disabled={saving || !form.nome.trim()}
              className="flex-1 bg-[#2D5016] hover:bg-[#2D5016]/90"
            >
              {saving ? 'A guardar...' : 'Guardar alterações'}
            </Button>
            <button
              onClick={() => { setModo('ver'); setForm({ nome: receita.nome, categoria: receita.categoria, descricao: receita.descricao ?? '', instrucoes: receita.instrucoes ?? '', dicas_campo: receita.dicas_campo ?? '', tags: receita.tags?.join(', ') ?? '' }) }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
