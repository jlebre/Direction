'use client'

import { useState } from 'react'
import { Plus, Trash2, Phone, Pill, Package, Clock, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Animado, FarmaciaMedicacao, FarmaciaInventario, ContactoEmergencia } from '@/types/mamas'
import { cn } from '@/lib/utils'

const CONTACTOS_PADRAO = [
  { tipo: 'saude24', nome: 'Saúde 24', telefone: '808 24 24 24' },
  { tipo: 'intoxicacao', nome: 'Centro de Intoxicação', telefone: '808 250 143' },
  { tipo: 'inem', nome: 'INEM / Emergência', telefone: '112' },
]

interface FarmaciaViewProps {
  campoId: string
  animados: Animado[]
  medicacoesIniciais: FarmaciaMedicacao[]
  inventarioInicial: FarmaciaInventario[]
  contactosIniciais: ContactoEmergencia[]
}

export function FarmaciaView({ campoId, animados, medicacoesIniciais, inventarioInicial, contactosIniciais }: FarmaciaViewProps) {
  const [medicacoes, setMedicacoes] = useState<FarmaciaMedicacao[]>(medicacoesIniciais)
  const [inventario, setInventario] = useState<FarmaciaInventario[]>(inventarioInicial)
  const [contactos, setContactos] = useState<ContactoEmergencia[]>(contactosIniciais)
  const [modalMed, setModalMed] = useState(false)
  const [modalInv, setModalInv] = useState(false)
  const [modalContact, setModalContact] = useState(false)
  const [formMed, setFormMed] = useState({ animado_id: '', medicamento: '', horarios: '', notas: '' })
  const [formInv, setFormInv] = useState({ item: '', quantidade_inicial: 1, notas: '' })
  const [formContact, setFormContact] = useState({ animado_id: '', tipo: '', nome: '', telefone: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function getNomeAnimado(animadoId: string): string {
    return animados.find((a) => a.id === animadoId)?.nome ?? 'Animado'
  }

  async function adicionarMedicacao() {
    if (!formMed.animado_id || !formMed.medicamento) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('farmacia_medicacoes')
        .insert({
          animado_id: formMed.animado_id,
          medicamento: formMed.medicamento,
          horarios: formMed.horarios.split(',').map((h) => h.trim()).filter(Boolean),
          notas: formMed.notas || null,
          ativo: true,
        })
        .select('*, animado:animados(id, nome)')
        .single()
      if (error) throw error
      setMedicacoes((prev) => [...prev, data as FarmaciaMedicacao])
      setFormMed({ animado_id: '', medicamento: '', horarios: '', notas: '' })
      setModalMed(false)
      toast.success('Medicação adicionada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function removerMedicacao(id: string) {
    await supabase.from('farmacia_medicacoes').delete().eq('id', id)
    setMedicacoes((prev) => prev.filter((m) => m.id !== id))
    toast.success('Removido')
  }

  async function adicionarInventario() {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('farmacia_inventario')
        .insert({ campo_id: campoId, ...formInv, quantidade_gasta: 0 })
        .select()
        .single()
      if (error) throw error
      setInventario((prev) => [...prev, data as FarmaciaInventario])
      setFormInv({ item: '', quantidade_inicial: 1, notas: '' })
      setModalInv(false)
      toast.success('Item adicionado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function atualizarGasto(id: string, gasto: number) {
    await supabase.from('farmacia_inventario').update({ quantidade_gasta: Math.max(0, gasto) }).eq('id', id)
    setInventario((prev) => prev.map((i) => (i.id === id ? { ...i, quantidade_gasta: Math.max(0, gasto) } : i)))
  }

  async function adicionarContacto() {
    if (!formContact.animado_id || !formContact.nome || !formContact.telefone) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('contactos_emergencia')
        .insert({
          animado_id: formContact.animado_id,
          tipo: formContact.tipo,
          nome: formContact.nome,
          telefone: formContact.telefone,
          notas: formContact.notas || null,
        })
        .select('*, animado:animados(id, nome)')
        .single()
      if (error) throw error
      setContactos((prev) => [...prev, data as ContactoEmergencia])
      setFormContact({ animado_id: '', tipo: '', nome: '', telefone: '', notas: '' })
      setModalContact(false)
      toast.success('Contacto adicionado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4">
      {/* Livrinho da Farmácia */}
      <Link
        href={`/campo/${campoId}/mamas/farmacia/guia`}
        className="flex items-center justify-between bg-[#2D5016] text-white rounded-xl px-4 py-3 mb-4 active:opacity-80"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <div>
            <p className="font-bold text-sm">Livrinho da Farmácia</p>
            <p className="text-xs opacity-80">Medicamentos, situações e urgências</p>
          </div>
        </div>
        <span className="text-white opacity-70 text-lg">→</span>
      </Link>

      <Tabs defaultValue="medicacoes">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="medicacoes" className="gap-1 text-xs sm:text-sm">
            <Pill className="h-3.5 w-3.5" />
            Medicações
          </TabsTrigger>
          <TabsTrigger value="inventario" className="gap-1 text-xs sm:text-sm">
            <Package className="h-3.5 w-3.5" />
            Inventário
          </TabsTrigger>
          <TabsTrigger value="contactos" className="gap-1 text-xs sm:text-sm">
            <Phone className="h-3.5 w-3.5" />
            Emergência
          </TabsTrigger>
        </TabsList>

        {/* Medicações */}
        <TabsContent value="medicacoes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{medicacoes.length} medicação{medicacoes.length !== 1 ? 'ões' : ''}</p>
            <Button size="sm" onClick={() => setModalMed(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
          {medicacoes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Pill className="h-10 w-10 mx-auto mb-2" />
              <p>Sem medicações registadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medicacoes.map((med) => (
                <div key={med.id} className="bg-white rounded-xl border border-[#E7E8D1] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#36454F]">{med.animado?.nome ?? getNomeAnimado(med.animado_id)}</p>
                      <p className="text-[#B85042] font-semibold text-sm">{med.medicamento}</p>
                    </div>
                    <button onClick={() => removerMedicacao(med.id)} className="text-[#F96167] hover:opacity-70">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {med.horarios && med.horarios.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {med.horarios.map((h) => (
                        <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                      ))}
                    </div>
                  )}
                  {med.notas && <p className="text-sm text-gray-500 mt-1 italic">{med.notas}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Inventário */}
        <TabsContent value="inventario" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{inventario.length} item{inventario.length !== 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => setModalInv(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
          {inventario.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-2" />
              <p>Caixa de farmácia vazia</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
              {inventario.map((item, i) => (
                <div
                  key={item.id}
                  className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-[#E7E8D1]')}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[#36454F]">{item.item}</p>
                    {item.notas && <p className="text-xs text-gray-400">{item.notas}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 text-xs">Inicial: {item.quantidade_inicial}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-xs text-gray-400">Gasto:</span>
                    <input
                      type="number"
                      min={0}
                      max={item.quantidade_inicial}
                      value={item.quantidade_gasta}
                      onChange={(e) => atualizarGasto(item.id, parseInt(e.target.value))}
                      className="w-14 text-center border border-gray-200 rounded-md py-1 text-sm text-[#36454F] focus:outline-none focus:ring-1 focus:ring-[#B85042]"
                    />
                    <span className="text-xs font-semibold text-[#B85042]">
                      Resto: {item.quantidade_inicial - item.quantidade_gasta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contactos */}
        <TabsContent value="contactos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Contactos de emergência</p>
            <Button size="sm" onClick={() => setModalContact(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          {/* Contactos nacionais fixos */}
          <div className="bg-[#F96167]/10 border border-[#F96167]/30 rounded-xl overflow-hidden">
            <div className="bg-[#F96167] px-4 py-2">
              <h3 className="text-white font-bold text-sm">Contactos Nacionais</h3>
            </div>
            {CONTACTOS_PADRAO.map((c, i) => (
              <div key={c.tipo} className={cn('flex items-center justify-between px-4 py-3', i > 0 && 'border-t border-[#F96167]/20')}>
                <div>
                  <p className="font-semibold text-[#36454F]">{c.nome}</p>
                </div>
                <a
                  href={`tel:${c.telefone.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 bg-[#F96167] text-white rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#e0545a] transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {c.telefone}
                </a>
              </div>
            ))}
          </div>

          {/* Contactos por animado */}
          {contactos.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
              <div className="bg-[#E7E8D1] px-4 py-2">
                <h3 className="font-bold text-[#36454F] text-sm">Contactos dos Animados</h3>
              </div>
              {contactos.map((c, i) => (
                <div key={c.id} className={cn('flex items-center justify-between px-4 py-3', i > 0 && 'border-t border-[#E7E8D1]')}>
                  <div>
                    <p className="font-semibold text-[#36454F]">{c.nome}</p>
                    <p className="text-xs text-gray-400">
                      {c.tipo && `${c.tipo} · `}{c.animado?.nome ?? getNomeAnimado(c.animado_id)}
                    </p>
                    {c.notas && <p className="text-xs text-gray-400 italic">{c.notas}</p>}
                  </div>
                  <a
                    href={`tel:${c.telefone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 bg-[#B85042] text-white rounded-lg px-3 py-2 text-sm font-bold"
                  >
                    <Phone className="h-4 w-4" />
                    {c.telefone}
                  </a>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Medicação */}
      <Dialog open={modalMed} onOpenChange={setModalMed}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar medicação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Animado</Label>
              <Select value={formMed.animado_id} onValueChange={(v) => setFormMed((f) => ({ ...f, animado_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar animado" /></SelectTrigger>
                <SelectContent>
                  {animados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Medicamento</Label>
              <Input placeholder="Cetoprofeno 100mg" value={formMed.medicamento} onChange={(e) => setFormMed((f) => ({ ...f, medicamento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Horários (separados por vírgula)</Label>
              <Input placeholder="08:00, 12:00, 20:00" value={formMed.horarios} onChange={(e) => setFormMed((f) => ({ ...f, horarios: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Tomar com comida..." value={formMed.notas} onChange={(e) => setFormMed((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMed(false)}>Cancelar</Button>
            <Button onClick={adicionarMedicacao} disabled={saving || !formMed.animado_id || !formMed.medicamento}>
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inventário */}
      <Dialog open={modalInv} onOpenChange={setModalInv}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar item à caixa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Item</Label>
              <Input placeholder="Compressas, Betadine, Paracetamol..." value={formInv.item} onChange={(e) => setFormInv((f) => ({ ...f, item: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Quantidade inicial</Label>
              <Input type="number" min={1} value={formInv.quantidade_inicial} onChange={(e) => setFormInv((f) => ({ ...f, quantidade_inicial: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Prazo de validade, etc." value={formInv.notas} onChange={(e) => setFormInv((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalInv(false)}>Cancelar</Button>
            <Button onClick={adicionarInventario} disabled={saving || !formInv.item}>
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Contacto */}
      <Dialog open={modalContact} onOpenChange={setModalContact}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar contacto de emergência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Animado</Label>
              <Select value={formContact.animado_id} onValueChange={(v) => setFormContact((f) => ({ ...f, animado_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar animado" /></SelectTrigger>
                <SelectContent>
                  {animados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input placeholder="Pai, Mãe, Tutor..." value={formContact.tipo} onChange={(e) => setFormContact((f) => ({ ...f, tipo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input placeholder="Maria Silva" value={formContact.nome} onChange={(e) => setFormContact((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input placeholder="912 345 678" value={formContact.telefone} onChange={(e) => setFormContact((f) => ({ ...f, telefone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Disponível das 9h às 18h..." value={formContact.notas} onChange={(e) => setFormContact((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalContact(false)}>Cancelar</Button>
            <Button onClick={adicionarContacto} disabled={saving || !formContact.animado_id || !formContact.nome || !formContact.telefone}>
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
