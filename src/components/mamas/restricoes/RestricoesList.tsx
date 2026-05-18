'use client'

import { useState } from 'react'
import { Plus, Trash2, AlertTriangle, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Animado, RestricaoAlimentar, RestricaoTipo } from '@/types/mamas'
import { cn } from '@/lib/utils'

const TIPO_LABELS: Record<RestricaoTipo, string> = {
  alergia: 'Alergia',
  intolerancia: 'Intolerância',
  dieta: 'Dieta',
  outro: 'Outro',
}

const TIPO_CORES: Record<RestricaoTipo, string> = {
  alergia: 'border-[#F96167] bg-[#F96167]/10 text-[#F96167]',
  intolerancia: 'border-yellow-400 bg-yellow-50 text-yellow-800',
  dieta: 'border-blue-300 bg-blue-50 text-blue-700',
  outro: 'border-gray-300 bg-gray-50 text-gray-600',
}

interface RestricaoFormData {
  animado_id: string
  tipo: RestricaoTipo
  descricao: string
  ingredientes_proibidos: string
  notas: string
}

const formVazio: RestricaoFormData = {
  animado_id: '',
  tipo: 'alergia',
  descricao: '',
  ingredientes_proibidos: '',
  notas: '',
}

export function RestricoesList({
  animados,
  restricoesIniciais,
}: {
  animados: Animado[]
  restricoesIniciais: RestricaoAlimentar[]
}) {
  const [restricoes, setRestricoes] = useState<RestricaoAlimentar[]>(restricoesIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<RestricaoFormData>(formVazio)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function getNomeAnimado(animadoId: string): string {
    return animados.find((a) => a.id === animadoId)?.nome ?? 'Animado'
  }

  function abrirNova() {
    setForm(formVazio)
    setEditId(null)
    setModalAberto(true)
  }

  function abrirEditar(r: RestricaoAlimentar) {
    setForm({
      animado_id: r.animado_id,
      tipo: r.tipo,
      descricao: r.descricao,
      ingredientes_proibidos: (r.ingredientes_proibidos ?? []).join(', '),
      notas: r.notas ?? '',
    })
    setEditId(r.id)
    setModalAberto(true)
  }

  async function guardar() {
    if (!form.animado_id || !form.descricao) return
    setSaving(true)
    const data = {
      animado_id: form.animado_id,
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      ingredientes_proibidos: form.ingredientes_proibidos
        ? form.ingredientes_proibidos.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      notas: form.notas.trim() || null,
    }
    try {
      if (editId) {
        const { data: updated, error } = await supabase
          .from('restricoes_alimentares')
          .update(data)
          .eq('id', editId)
          .select('*, animado:animados(id, nome)')
          .single()
        if (error) throw error
        setRestricoes((prev) => prev.map((r) => (r.id === editId ? (updated as RestricaoAlimentar) : r)))
      } else {
        const { data: nova, error } = await supabase
          .from('restricoes_alimentares')
          .insert(data)
          .select('*, animado:animados(id, nome)')
          .single()
        if (error) throw error
        setRestricoes((prev) => [...prev, nova as RestricaoAlimentar])
      }
      toast.success('Guardado')
      setModalAberto(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function remover(id: string) {
    const { error } = await supabase.from('restricoes_alimentares').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover'); return }
    setRestricoes((prev) => prev.filter((r) => r.id !== id))
    toast.success('Removido')
  }

  const contagem: Record<RestricaoTipo, number> = {
    alergia: 0, intolerancia: 0, dieta: 0, outro: 0,
  }
  restricoes.forEach((r) => { contagem[r.tipo]++ })

  return (
    <div className="p-4 space-y-4">
      {/* Resumo */}
      {restricoes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(contagem) as [RestricaoTipo, number][])
            .filter(([, n]) => n > 0)
            .map(([tipo, n]) => (
              <div key={tipo} className={cn('rounded-lg border p-3 text-center', TIPO_CORES[tipo])}>
                <p className="text-2xl font-bold">{n}</p>
                <p className="text-xs font-semibold">{TIPO_LABELS[tipo]}{n !== 1 ? 's' : ''}</p>
              </div>
            ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{restricoes.length} restrição{restricoes.length !== 1 ? 'ões' : ''}</p>
        <Button onClick={abrirNova} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {restricoes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 space-y-2">
          <AlertTriangle className="h-10 w-10 mx-auto" />
          <p>Sem restrições alimentares registadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {restricoes.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-[#E7E8D1] p-4 space-y-2">
              <div className="flex items-start gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="font-bold text-[#36454F]">{r.animado?.nome ?? getNomeAnimado(r.animado_id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn('border text-xs', TIPO_CORES[r.tipo])}>
                    {TIPO_LABELS[r.tipo]}
                  </Badge>
                  <button onClick={() => abrirEditar(r)} className="text-xs text-gray-400 hover:text-[#B85042] transition-colors">
                    Editar
                  </button>
                  <button onClick={() => remover(r.id)} className="text-[#F96167] hover:opacity-70 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Alert variant={r.tipo === 'alergia' ? 'destructive' : 'warning'} className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{r.descricao}</AlertDescription>
              </Alert>

              {r.ingredientes_proibidos && r.ingredientes_proibidos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-400">Ingredientes:</span>
                  {r.ingredientes_proibidos.map((ing) => (
                    <span key={ing} className="text-xs bg-[#F96167]/10 text-[#F96167] rounded-full px-2 py-0.5 font-medium">
                      {ing}
                    </span>
                  ))}
                </div>
              )}

              {r.notas && <p className="text-sm text-gray-500 italic">{r.notas}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar restrição' : 'Nova restrição'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label>Animado</Label>
                <Select value={form.animado_id} onValueChange={(v) => setForm((f) => ({ ...f, animado_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {animados.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as RestricaoTipo }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_LABELS) as [RestricaoTipo, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                placeholder="Alergia a frutos secos, intolerância à lactose..."
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Ingredientes proibidos (separados por vírgula)</Label>
              <Input
                placeholder="amendoins, nozes, cajus"
                value={form.ingredientes_proibidos}
                onChange={(e) => setForm((f) => ({ ...f, ingredientes_proibidos: e.target.value }))}
              />
              <p className="text-xs text-gray-400">Estes ingredientes serão cruzados com a ementa para gerar alertas</p>
            </div>
            <div className="space-y-1">
              <Label>Notas adicionais</Label>
              <Textarea
                placeholder="Separar o molho no prato dele..."
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving || !form.animado_id || !form.descricao}>
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
