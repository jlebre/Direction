'use client'

import { useState } from 'react'
import { Plus, Trash2, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Dica {
  id: string
  campo_id: string
  titulo: string
  conteudo: string
  created_at: string
}

export default function DicasClient({ campoId, dicasIniciais }: { campoId: string; dicasIniciais: Dica[] }) {
  const [dicas, setDicas] = useState<Dica[]>(dicasIniciais)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', conteudo: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function guardar() {
    if (!form.titulo || !form.conteudo) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('campo_dicas')
        .insert({ campo_id: campoId, titulo: form.titulo.trim(), conteudo: form.conteudo.trim() })
        .select()
        .single()
      if (error) throw error
      setDicas((prev) => [data as Dica, ...prev])
      setForm({ titulo: '', conteudo: '' })
      setModal(false)
      toast.success('Dica adicionada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function remover(id: string) {
    await supabase.from('campo_dicas').delete().eq('id', id)
    setDicas((prev) => prev.filter((d) => d.id !== id))
    toast.success('Dica removida')
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{dicas.length} dica{dicas.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setModal(true)} className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {dicas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Lightbulb className="h-10 w-10 mx-auto mb-2" />
          <p>Nenhuma dica registada</p>
          <p className="text-xs mt-1">Adiciona truques e sugestões para a mamã</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dicas.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-[#E7E8D1] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="h-4 w-4 text-[#2D5016] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#36454F] text-sm">{d.titulo}</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{d.conteudo}</p>
                  </div>
                </div>
                <button onClick={() => remover(d.id)} className="text-gray-300 hover:text-[#F96167] transition-colors shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova dica</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input placeholder="Conservar a carne..." value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Conteúdo</Label>
              <Textarea
                rows={4}
                placeholder="Colocar num saco com gelo no fundo da geleira..."
                value={form.conteudo}
                onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving || !form.titulo || !form.conteudo} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
