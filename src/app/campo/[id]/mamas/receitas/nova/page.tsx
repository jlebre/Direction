'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function NovaReceitaPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [form, setForm] = useState({
    nome: '',
    categoria: 'sopa' as CategoriaReceita,
    descricao: '',
    instrucoes: '',
    dicas_campo: DICAS_SOPA,
    tags: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function handleCategoria(v: CategoriaReceita) {
    setForm((f) => ({
      ...f,
      categoria: v,
      dicas_campo: v === 'sopa' && !f.dicas_campo.trim() ? DICAS_SOPA : f.dicas_campo,
    }))
  }

  async function guardar() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('receitas').insert({
        nome: form.nome.trim(),
        categoria: form.categoria,
        descricao: form.descricao.trim() || null,
        instrucoes: form.instrucoes.trim() || null,
        dicas_campo: form.dicas_campo.trim() || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        pessoas_base: 58,
        is_oficial: false,
      })
      if (error) throw error
      toast.success('Receita criada!')
      router.push(`/campo/${params.id}/mamas/receitas`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
      setSaving(false)
    }
  }

  return (
    <>
      <Header title="Nova Receita" backHref={`/campo/${params.id}/mamas/receitas`} />
      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">
        <div className="space-y-1">
          <Label>Nome *</Label>
          <Input placeholder="Canja de galinha" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} autoFocus />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={form.categoria} onValueChange={(v) => handleCategoria(v as CategoriaReceita)}>
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
          <Input placeholder="Uma canja reconfortante..." value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Instruções</Label>
          <Textarea rows={5} placeholder="1. Cozer a galinha...\n2. ..." value={form.instrucoes} onChange={(e) => setForm((f) => ({ ...f, instrucoes: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Dica para o campo</Label>
          <Textarea rows={2} placeholder="Pode fazer-se de véspera..." value={form.dicas_campo} onChange={(e) => setForm((f) => ({ ...f, dicas_campo: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Tags (separadas por vírgula)</Label>
          <Input placeholder="vegetariano, rápido, económico" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </div>
        <Button onClick={guardar} disabled={saving || !form.nome.trim()} className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90">
          {saving ? 'A guardar...' : 'Criar receita'}
        </Button>
      </div>
    </>
  )
}
