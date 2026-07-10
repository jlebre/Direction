'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/mamas/Header'
import { CATEGORIA_LABELS } from '@/types/mamas'
import type { CategoriaReceita } from '@/types/mamas'

const DICAS_SOPA = `- Usar a água de cozer a massa para fazer a sopa.
- Dissolver os pacotes de sopa em menos água primeiro e aos pouquinhos, para evitar grumos.
- Dá para fazer a sopa na sorna; aguenta a temperatura até ao jantar.`

export default function NovaReceitaClient({ campoId }: { campoId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    nome: '',
    categoria: '' as CategoriaReceita | '',
    descricao: '',
    instrucoes: '',
    dicas_campo: '',
    tags: '',
  })
  const [dicasAutoAdicionadas, setDicasAutoAdicionadas] = useState(false)
  const [dicasPrompt, setDicasPrompt] = useState<'add' | 'remove' | false>(false)
  const [pendingCategoria, setPendingCategoria] = useState<CategoriaReceita | ''>('')
  const [saving, setSaving] = useState(false)

  function handleCategoria(v: CategoriaReceita | '') {
    const dicasAtuais = form.dicas_campo.trim()

    if (v === 'sopa') {
      if (!dicasAtuais) {
        setForm((f) => ({ ...f, categoria: v, dicas_campo: DICAS_SOPA }))
        setDicasAutoAdicionadas(true)
        setDicasPrompt(false)
      } else {
        setPendingCategoria(v)
        setDicasPrompt('add')
      }
    } else if (form.categoria === 'sopa' && dicasAutoAdicionadas) {
      setPendingCategoria(v)
      setDicasPrompt('remove')
    } else {
      setForm((f) => ({ ...f, categoria: v }))
      setDicasPrompt(false)
    }
  }

  function confirmarAdicionarDicas() {
    setForm((f) => ({ ...f, categoria: pendingCategoria as CategoriaReceita, dicas_campo: DICAS_SOPA }))
    setDicasAutoAdicionadas(true)
    setDicasPrompt(false)
  }

  function manterNotasManuais() {
    setForm((f) => ({ ...f, categoria: pendingCategoria as CategoriaReceita }))
    setDicasAutoAdicionadas(false)
    setDicasPrompt(false)
  }

  function confirmarRemoverDicas() {
    setForm((f) => ({ ...f, categoria: pendingCategoria as CategoriaReceita, dicas_campo: '' }))
    setDicasAutoAdicionadas(false)
    setDicasPrompt(false)
  }

  function manterDicas() {
    setForm((f) => ({ ...f, categoria: pendingCategoria as CategoriaReceita }))
    setDicasAutoAdicionadas(false)
    setDicasPrompt(false)
  }

  async function guardar() {
    if (!form.nome.trim()) return
    if (!form.categoria) { toast.error('Seleciona uma categoria para a receita'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('receitas').insert({
        nome: form.nome.trim(),
        categoria: form.categoria as CategoriaReceita,
        descricao: form.descricao.trim() || null,
        instrucoes: form.instrucoes.trim() || null,
        dicas_campo: form.dicas_campo.trim() || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        pessoas_base: 58,
        is_oficial: false,
      })
      if (error) throw error
      toast.success('Receita criada!')
      router.push(`/campo/${campoId}/receitas`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
      setSaving(false)
    }
  }

  return (
    <>
      <Header title="Nova Receita" backHref={`/campo/${campoId}/receitas`} />
      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">
        <div className="space-y-1">
          <Label>Nome *</Label>
          <Input
            placeholder="Canja de galinha"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <Label>Categoria *</Label>
          <Select value={form.categoria} onValueChange={(v) => handleCategoria(v as CategoriaReceita)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar tipo de receita..." />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CATEGORIA_LABELS) as [CategoriaReceita, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {dicasPrompt === 'add' && (
          <div className="bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-xl p-3 space-y-2">
            <p className="text-sm font-medium text-[#2D5016]">Selecionaste &quot;Sopa&quot;.</p>
            <p className="text-xs text-gray-600">Queres substituir as tuas notas pelas dicas default de sopa?</p>
            <div className="flex gap-2">
              <button type="button" onClick={confirmarAdicionarDicas}
                className="text-xs font-medium text-white bg-[#2D5016] hover:bg-[#2D5016]/90 rounded-lg px-3 py-1.5 transition-colors">
                Adicionar dicas de sopa
              </button>
              <button type="button" onClick={manterNotasManuais}
                className="text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
                Manter as minhas notas
              </button>
            </div>
          </div>
        )}

        {dicasPrompt === 'remove' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <p className="text-xs text-amber-700">Estas dicas foram adicionadas automaticamente porque a receita era sopa. Queres removê-las?</p>
            <div className="flex gap-2">
              <button type="button" onClick={confirmarRemoverDicas}
                className="text-xs font-medium text-amber-800 border border-amber-300 bg-white hover:bg-amber-50 rounded-lg px-3 py-1.5 transition-colors">
                Remover dicas
              </button>
              <button type="button" onClick={manterDicas}
                className="text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
                Manter dicas
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label>Descrição</Label>
          <Input placeholder="Uma canja reconfortante..." value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Preparação</Label>
          <Textarea rows={5} placeholder="1. Cozer a galinha...&#10;2. ..."
            value={form.instrucoes}
            onChange={(e) => setForm((f) => ({ ...f, instrucoes: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Dica para o campo</Label>
          <Textarea rows={3} placeholder="Pode fazer-se de véspera..."
            value={form.dicas_campo}
            onChange={(e) => {
              setForm((f) => ({ ...f, dicas_campo: e.target.value }))
              setDicasAutoAdicionadas(false)
            }} />
        </div>
        <div className="space-y-1">
          <Label>Tags (separadas por vírgula)</Label>
          <Input placeholder="vegetariano, rápido, económico" value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </div>
        <Button onClick={guardar} disabled={saving || !form.nome.trim()}
          className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90">
          {saving ? 'A guardar...' : 'Criar receita'}
        </Button>
      </div>
    </>
  )
}
