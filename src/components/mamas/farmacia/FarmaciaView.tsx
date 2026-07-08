'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, Phone, Pill, Clock, BookOpen, Bell, Check } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { FarmaciaMedicacao, ContactoEmergencia } from '@/types/mamas'
import { cn } from '@/lib/utils'

const CONTACTOS_PADRAO = [
  { tipo: 'saude24', nome: 'Saúde 24', telefone: '808 24 24 24' },
  { tipo: 'intoxicacao', nome: 'Centro de Intoxicação', telefone: '808 250 143' },
  { tipo: 'inem', nome: 'INEM / Emergência', telefone: '112' },
]

interface FarmaciaViewProps {
  campoId: string
  medicacoesIniciais: FarmaciaMedicacao[]
  contactosIniciais: ContactoEmergencia[]
}

function getNomeCrianca(m: { crianca_nome?: string | null; animado?: { nome: string } | null }): string {
  return m.crianca_nome ?? m.animado?.nome ?? 'Criança'
}

// Calcula o estado da próxima toma para uma medicação
function estadoProximaToma(horarios: string[]): { label: string; cor: string } | null {
  if (!horarios || horarios.length === 0) return null
  const agora = new Date()
  const hh = agora.getHours()
  const mm = agora.getMinutes()
  const minutosAgora = hh * 60 + mm

  const todasEmMinutos = horarios
    .map((h) => {
      const [hStr, mStr] = h.split(':')
      const horasNum = parseInt(hStr, 10)
      const minsNum = parseInt(mStr, 10)
      if (isNaN(horasNum) || isNaN(minsNum)) return null
      return horasNum * 60 + minsNum
    })
    .filter((m): m is number => m !== null)
    .sort((a, b) => a - b)

  if (todasEmMinutos.length === 0) return null

  // Próxima futura (ou a primeira do dia seguinte se já passaram todas)
  const proxima = todasEmMinutos.find((m) => m >= minutosAgora) ?? todasEmMinutos[0]
  const diff = proxima >= minutosAgora ? proxima - minutosAgora : (24 * 60 - minutosAgora) + proxima

  const hProxima = Math.floor(proxima / 60).toString().padStart(2, '0')
  const mProxima = (proxima % 60).toString().padStart(2, '0')
  const label = `${hProxima}:${mProxima}`

  if (diff <= 15) return { label: `Agora (${label})`, cor: 'bg-red-100 text-red-700 border-red-200' }
  if (diff <= 60) return { label: `Em breve (${label})`, cor: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label, cor: 'bg-gray-50 text-gray-500 border-gray-200' }
}

export function FarmaciaView({ campoId, medicacoesIniciais, contactosIniciais }: FarmaciaViewProps) {
  const [medicacoes, setMedicacoes] = useState<FarmaciaMedicacao[]>(medicacoesIniciais)
  const [contactos, setContactos] = useState<ContactoEmergencia[]>(contactosIniciais)
  const [modalMed, setModalMed] = useState(false)
  const [modalContact, setModalContact] = useState(false)
  const [formMed, setFormMed] = useState({ crianca_nome: '', medicamento: '', dose: '', horarios: '', notas: '' })
  const [formContact, setFormContact] = useState({ crianca_nome: '', tipo: '', nome: '', telefone: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const pendentes = useMemo(
    () => medicacoes.filter((m) => m.ativo && m.horarios && m.horarios.length > 0),
    [medicacoes]
  )

  async function adicionarMedicacao() {
    if (!formMed.crianca_nome.trim() || !formMed.medicamento.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('farmacia_medicacoes')
        .insert({
          campo_id: campoId,
          crianca_nome: formMed.crianca_nome.trim(),
          medicamento: formMed.medicamento.trim(),
          dose: formMed.dose.trim() || null,
          horarios: formMed.horarios.split(',').map((h) => h.trim()).filter(Boolean),
          notas: formMed.notas.trim() || null,
          ativo: true,
        })
        .select('*')
        .single()
      if (error) throw error
      setMedicacoes((prev) => [...prev, data as FarmaciaMedicacao])
      setFormMed({ crianca_nome: '', medicamento: '', dose: '', horarios: '', notas: '' })
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

  async function marcarAdministrado(med: FarmaciaMedicacao) {
    const agora = new Date().toISOString()
    const { error } = await supabase.from('tomas_medicacao').insert({
      medicacao_id: med.id,
      data_hora_prevista: agora,
      data_hora_administrada: agora,
      estado: 'administrado',
    })
    if (error) { toast.error('Erro ao registar toma'); return }
    toast.success(`${med.medicamento} registado como administrado`)
  }

  async function adicionarContacto() {
    if (!formContact.nome.trim() || !formContact.telefone.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('contactos_emergencia')
        .insert({
          campo_id: campoId,
          crianca_nome: formContact.crianca_nome.trim() || null,
          tipo: formContact.tipo.trim() || null,
          nome: formContact.nome.trim(),
          telefone: formContact.telefone.trim(),
          notas: formContact.notas.trim() || null,
        })
        .select('*')
        .single()
      if (error) throw error
      setContactos((prev) => [...prev, data as ContactoEmergencia])
      setFormContact({ crianca_nome: '', tipo: '', nome: '', telefone: '', notas: '' })
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

      {/* Alerta de medicações pendentes */}
      {pendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {pendentes.length} medicação{pendentes.length !== 1 ? 'ões' : ''} ativa{pendentes.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600">Verifica os horários abaixo</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="medicacoes">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="medicacoes" className="gap-1 text-xs sm:text-sm">
            <Pill className="h-3.5 w-3.5" />
            Medicações
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
              {medicacoes.map((med) => {
                const proximaToma = estadoProximaToma(med.horarios ?? [])
                return (
                  <div key={med.id} className="bg-white rounded-xl border border-[#E7E8D1] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[#36454F]">{getNomeCrianca(med)}</p>
                        <p className="text-[#B85042] font-semibold text-sm">{med.medicamento}</p>
                        {med.dose && (
                          <p className="text-xs text-gray-500 mt-0.5">{med.dose}</p>
                        )}
                      </div>
                      <button onClick={() => removerMedicacao(med.id)} className="text-[#F96167] hover:opacity-70 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {med.horarios && med.horarios.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {med.horarios.map((h) => (
                          <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                        ))}
                      </div>
                    )}
                    {proximaToma && (
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className={cn('text-xs border rounded-full px-2.5 py-0.5 font-medium', proximaToma.cor)}>
                          Próxima toma: {proximaToma.label}
                        </span>
                        <button
                          onClick={() => marcarAdministrado(med)}
                          className="flex items-center gap-1 text-xs text-[#2D5016] border border-[#2D5016]/30 rounded-lg px-2 py-1 hover:bg-[#2D5016]/5 transition-colors"
                        >
                          <Check className="h-3 w-3" /> Administrado
                        </button>
                      </div>
                    )}
                    {med.notas && <p className="text-sm text-gray-500 mt-1 italic">{med.notas}</p>}
                  </div>
                )
              })}
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

          {/* Contactos do campo */}
          {contactos.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
              <div className="bg-[#E7E8D1] px-4 py-2">
                <h3 className="font-bold text-[#36454F] text-sm">Contactos do Campo</h3>
              </div>
              {contactos.map((c, i) => (
                <div key={c.id} className={cn('flex items-center justify-between px-4 py-3', i > 0 && 'border-t border-[#E7E8D1]')}>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#36454F]">{c.nome}</p>
                    <p className="text-xs text-gray-400">
                      {c.tipo ? `${c.tipo} · ` : ''}
                      {c.crianca_nome ?? getNomeCrianca(c)}
                    </p>
                    {c.notas && <p className="text-xs text-gray-400 italic">{c.notas}</p>}
                  </div>
                  <a
                    href={`tel:${c.telefone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 bg-[#B85042] text-white rounded-lg px-3 py-2 text-sm font-bold shrink-0"
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
              <Label>Nome da criança</Label>
              <Input
                autoFocus
                placeholder="Maria, João..."
                value={formMed.crianca_nome}
                onChange={(e) => setFormMed((f) => ({ ...f, crianca_nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Medicamento</Label>
              <Input
                placeholder="Cetoprofeno 100mg"
                value={formMed.medicamento}
                onChange={(e) => setFormMed((f) => ({ ...f, medicamento: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Dose</Label>
              <Input
                placeholder="1 comprimido, 5 ml..."
                value={formMed.dose}
                onChange={(e) => setFormMed((f) => ({ ...f, dose: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Horários (separados por vírgula)</Label>
              <Input
                placeholder="08:00, 14:00, 20:00"
                value={formMed.horarios}
                onChange={(e) => setFormMed((f) => ({ ...f, horarios: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Tomar com comida..."
                value={formMed.notas}
                onChange={(e) => setFormMed((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMed(false)}>Cancelar</Button>
            <Button
              onClick={adicionarMedicacao}
              disabled={saving || !formMed.crianca_nome.trim() || !formMed.medicamento.trim()}
            >
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
              <Label>Nome da criança <span className="text-gray-400 font-normal text-xs">(opcional)</span></Label>
              <Input
                placeholder="Maria, João..."
                value={formContact.crianca_nome}
                onChange={(e) => setFormContact((f) => ({ ...f, crianca_nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo de contacto</Label>
              <Input
                placeholder="Pai, Mãe, Tutor..."
                value={formContact.tipo}
                onChange={(e) => setFormContact((f) => ({ ...f, tipo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Nome do contacto</Label>
              <Input
                placeholder="Maria Silva"
                value={formContact.nome}
                onChange={(e) => setFormContact((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                placeholder="912 345 678"
                value={formContact.telefone}
                onChange={(e) => setFormContact((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Disponível das 9h às 18h..."
                value={formContact.notas}
                onChange={(e) => setFormContact((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalContact(false)}>Cancelar</Button>
            <Button
              onClick={adicionarContacto}
              disabled={saving || !formContact.nome.trim() || !formContact.telefone.trim()}
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
