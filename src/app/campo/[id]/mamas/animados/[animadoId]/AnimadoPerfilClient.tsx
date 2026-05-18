'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, AlertTriangle, Pill, Phone, Clock, User, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Animado, RestricaoAlimentar, RestricaoTipo, FarmaciaMedicacao, ContactoEmergencia } from '@/types/mamas'
import { SECCAO_LABELS } from '@/types/shared'
import { cn } from '@/lib/utils'

const TIPO_LABELS: Record<RestricaoTipo, string> = {
  alergia: 'Alergia',
  intolerancia: 'Intolerância',
  dieta: 'Dieta',
  outro: 'Outro',
}
const TIPO_CORES: Record<RestricaoTipo, string> = {
  alergia: 'border-red-300 bg-red-50 text-red-700',
  intolerancia: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  dieta: 'border-blue-300 bg-blue-50 text-blue-700',
  outro: 'border-gray-300 bg-gray-50 text-gray-600',
}

export default function AnimadoPerfilClient({
  campoId,
  animado,
  restricoesIniciais,
  medicacoesIniciais,
  contactosIniciais,
}: {
  campoId: string
  animado: Animado
  restricoesIniciais: RestricaoAlimentar[]
  medicacoesIniciais: FarmaciaMedicacao[]
  contactosIniciais: ContactoEmergencia[]
}) {
  const router = useRouter()
  const [restricoes, setRestricoes] = useState<RestricaoAlimentar[]>(restricoesIniciais)
  const [medicacoes, setMedicacoes] = useState<FarmaciaMedicacao[]>(medicacoesIniciais)
  const [contactos, setContactos] = useState<ContactoEmergencia[]>(contactosIniciais)
  const [modalRes, setModalRes] = useState(false)
  const [modalMed, setModalMed] = useState(false)
  const [modalContact, setModalContact] = useState(false)
  const [formRes, setFormRes] = useState({ tipo: 'alergia' as RestricaoTipo, descricao: '', ingredientes_proibidos: '', notas: '' })
  const [formMed, setFormMed] = useState({ medicamento: '', horarios: '', notas: '' })
  const [formContact, setFormContact] = useState({ tipo: '', nome: '', telefone: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [deletingAnimado, setDeletingAnimado] = useState(false)
  const supabase = createClient()

  const idade = animado.data_nascimento
    ? Math.floor((Date.now() - new Date(animado.data_nascimento + 'T00:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  async function adicionarRestricao() {
    if (!formRes.descricao) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('restricoes_alimentares')
        .insert({
          animado_id: animado.id,
          tipo: formRes.tipo,
          descricao: formRes.descricao.trim(),
          ingredientes_proibidos: formRes.ingredientes_proibidos
            ? formRes.ingredientes_proibidos.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          notas: formRes.notas.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      setRestricoes((prev) => [...prev, data as RestricaoAlimentar])
      setFormRes({ tipo: 'alergia', descricao: '', ingredientes_proibidos: '', notas: '' })
      setModalRes(false)
      toast.success('Restrição adicionada')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') } finally { setSaving(false) }
  }

  async function adicionarMedicacao() {
    if (!formMed.medicamento) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('farmacia_medicacoes')
        .insert({
          animado_id: animado.id,
          medicamento: formMed.medicamento.trim(),
          horarios: formMed.horarios.split(',').map((h) => h.trim()).filter(Boolean),
          notas: formMed.notas.trim() || null,
          ativo: true,
        })
        .select()
        .single()
      if (error) throw error
      setMedicacoes((prev) => [...prev, data as FarmaciaMedicacao])
      setFormMed({ medicamento: '', horarios: '', notas: '' })
      setModalMed(false)
      toast.success('Medicação adicionada')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') } finally { setSaving(false) }
  }

  async function adicionarContacto() {
    if (!formContact.nome || !formContact.telefone) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('contactos_emergencia')
        .insert({
          animado_id: animado.id,
          tipo: formContact.tipo.trim() || null,
          nome: formContact.nome.trim(),
          telefone: formContact.telefone.trim(),
          notas: formContact.notas.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      setContactos((prev) => [...prev, data as ContactoEmergencia])
      setFormContact({ tipo: '', nome: '', telefone: '', notas: '' })
      setModalContact(false)
      toast.success('Contacto adicionado')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') } finally { setSaving(false) }
  }

  async function eliminarAnimado() {
    if (!confirm(`Eliminar ${animado.nome}? Esta ação é irreversível.`)) return
    setDeletingAnimado(true)
    await supabase.from('animados').delete().eq('id', animado.id)
    toast.success('Animado eliminado')
    router.push(`/campo/${campoId}/mamas/animados`)
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Info card */}
      <div className="px-4 py-4 bg-[#2D5016]/5 border-b border-[#E7E8D1]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#2D5016]/15 flex items-center justify-center">
            <User className="h-6 w-6 text-[#2D5016]" />
          </div>
          <div>
            <p className="font-bold text-[#36454F]">{animado.nome}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {animado.seccao && (
                <span className="text-xs text-gray-500">{SECCAO_LABELS[animado.seccao as keyof typeof SECCAO_LABELS] ?? animado.seccao}</span>
              )}
              {idade !== null && (
                <span className="text-xs text-gray-500">· {idade} anos</span>
              )}
              {animado.data_nascimento && (
                <span className="text-xs text-gray-400">
                  · {new Date(animado.data_nascimento + 'T00:00:00').toLocaleDateString('pt-PT')}
                </span>
              )}
            </div>
            {animado.notas && <p className="text-xs text-gray-500 italic mt-1">{animado.notas}</p>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="restricoes" className="px-4 py-4">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="restricoes" className="gap-1 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            Restrições ({restricoes.length})
          </TabsTrigger>
          <TabsTrigger value="medicacoes" className="gap-1 text-xs">
            <Pill className="h-3.5 w-3.5" />
            Medicações ({medicacoes.length})
          </TabsTrigger>
          <TabsTrigger value="contactos" className="gap-1 text-xs">
            <Phone className="h-3.5 w-3.5" />
            Contactos ({contactos.length})
          </TabsTrigger>
        </TabsList>

        {/* Restrições */}
        <TabsContent value="restricoes" className="space-y-3">
          <Button size="sm" onClick={() => setModalRes(true)} className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
            <Plus className="h-4 w-4" /> Adicionar restrição
          </Button>
          {restricoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem restrições alimentares</p>
          ) : (
            restricoes.map((r) => (
              <div key={r.id} className={cn('rounded-xl border p-3', TIPO_CORES[r.tipo])}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge className={cn('text-xs border mb-1', TIPO_CORES[r.tipo])}>{TIPO_LABELS[r.tipo]}</Badge>
                    <p className="text-sm font-semibold">{r.descricao}</p>
                    {r.ingredientes_proibidos?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.ingredientes_proibidos.map((ing) => (
                          <span key={ing} className="text-xs bg-white/60 rounded-full px-2 py-0.5">{ing}</span>
                        ))}
                      </div>
                    )}
                    {r.notas && <p className="text-xs opacity-70 mt-1 italic">{r.notas}</p>}
                  </div>
                  <button onClick={async () => { await supabase.from('restricoes_alimentares').delete().eq('id', r.id); setRestricoes((p) => p.filter((x) => x.id !== r.id)); toast.success('Removido') }}>
                    <Trash2 className="h-4 w-4 opacity-50 hover:opacity-100" />
                  </button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Medicações */}
        <TabsContent value="medicacoes" className="space-y-3">
          <Button size="sm" onClick={() => setModalMed(true)} className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
            <Plus className="h-4 w-4" /> Adicionar medicação
          </Button>
          {medicacoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem medicações registadas</p>
          ) : (
            medicacoes.map((m) => (
              <div key={m.id} className="bg-white rounded-xl border border-[#E7E8D1] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#B85042] text-sm">{m.medicamento}</p>
                    {m.horarios?.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {m.horarios.map((h) => <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>)}
                      </div>
                    )}
                    {m.notas && <p className="text-xs text-gray-500 italic mt-1">{m.notas}</p>}
                  </div>
                  <button onClick={async () => { await supabase.from('farmacia_medicacoes').delete().eq('id', m.id); setMedicacoes((p) => p.filter((x) => x.id !== m.id)); toast.success('Removido') }}>
                    <Trash2 className="h-4 w-4 text-gray-300 hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Contactos */}
        <TabsContent value="contactos" className="space-y-3">
          <Button size="sm" onClick={() => setModalContact(true)} className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
            <Plus className="h-4 w-4" /> Adicionar contacto
          </Button>
          {contactos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem contactos de emergência</p>
          ) : (
            contactos.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-[#E7E8D1] p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-[#36454F] text-sm">{c.nome}</p>
                  {c.tipo && <p className="text-xs text-gray-400">{c.tipo}</p>}
                  {c.notas && <p className="text-xs text-gray-400 italic">{c.notas}</p>}
                </div>
                <a
                  href={`tel:${c.telefone.replace(/\s/g, '')}`}
                  className="flex items-center gap-1.5 bg-[#B85042] text-white rounded-lg px-3 py-1.5 text-sm font-bold"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {c.telefone}
                </a>
                <button onClick={async () => { await supabase.from('contactos_emergencia').delete().eq('id', c.id); setContactos((p) => p.filter((x) => x.id !== c.id)); toast.success('Removido') }}>
                  <Trash2 className="h-4 w-4 text-gray-300 hover:text-red-500" />
                </button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <div className="px-4 pb-8">
        <button
          onClick={eliminarAnimado}
          disabled={deletingAnimado}
          className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 active:bg-red-100 text-sm disabled:opacity-50"
        >
          {deletingAnimado ? 'A eliminar...' : 'Eliminar Animado'}
        </button>
      </div>

      {/* Modal Restrição */}
      <Dialog open={modalRes} onOpenChange={setModalRes}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova restrição alimentar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={formRes.tipo} onValueChange={(v) => setFormRes((f) => ({ ...f, tipo: v as RestricaoTipo }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_LABELS) as [RestricaoTipo, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input placeholder="Alergia a amendoins..." value={formRes.descricao} onChange={(e) => setFormRes((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Ingredientes proibidos (separados por vírgula)</Label>
              <Input placeholder="amendoins, nozes" value={formRes.ingredientes_proibidos} onChange={(e) => setFormRes((f) => ({ ...f, ingredientes_proibidos: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={2} placeholder="Instruções adicionais..." value={formRes.notas} onChange={(e) => setFormRes((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRes(false)}>Cancelar</Button>
            <Button onClick={adicionarRestricao} disabled={saving || !formRes.descricao} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Medicação */}
      <Dialog open={modalMed} onOpenChange={setModalMed}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova medicação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Medicamento *</Label>
              <Input placeholder="Cetoprofeno 100mg" value={formMed.medicamento} onChange={(e) => setFormMed((f) => ({ ...f, medicamento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Horários (separados por vírgula)</Label>
              <Input placeholder="08:00, 20:00" value={formMed.horarios} onChange={(e) => setFormMed((f) => ({ ...f, horarios: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Tomar com comida..." value={formMed.notas} onChange={(e) => setFormMed((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMed(false)}>Cancelar</Button>
            <Button onClick={adicionarMedicacao} disabled={saving || !formMed.medicamento} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Contacto */}
      <Dialog open={modalContact} onOpenChange={setModalContact}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo contacto de emergência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input placeholder="Pai, Mãe, Tutor..." value={formContact.tipo} onChange={(e) => setFormContact((f) => ({ ...f, tipo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input placeholder="João Silva" value={formContact.nome} onChange={(e) => setFormContact((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Telefone *</Label>
              <Input placeholder="912 345 678" value={formContact.telefone} onChange={(e) => setFormContact((f) => ({ ...f, telefone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Disponível das 9h às 18h..." value={formContact.notas} onChange={(e) => setFormContact((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalContact(false)}>Cancelar</Button>
            <Button onClick={adicionarContacto} disabled={saving || !formContact.nome || !formContact.telefone} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
