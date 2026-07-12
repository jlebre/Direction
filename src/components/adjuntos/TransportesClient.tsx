'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, FileText, Upload, Download, X, ChevronLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Campo } from '@/types/shared'
import type { Transporte, TransporteSentido, TransporteTipo, TransporteEstado } from '@/types/transportes'
import {
  SENTIDO_LABELS, TIPO_TRANSPORTE_LABELS, TIPO_TRANSPORTE_EMOJI,
  ESTADO_LABELS, ESTADO_CORES,
} from '@/types/transportes'
import { cn } from '@/lib/utils'

interface TransporteFormData {
  sentido: TransporteSentido
  origem: string
  destino: string
  tipo_transporte: TransporteTipo
  data: string
  hora_partida: string
  hora_chegada: string
  empresa: string
  numero_referencia: string
  preco: string
  observacoes: string
  estado: TransporteEstado
}

const FORM_VAZIO: TransporteFormData = {
  sentido: 'ida',
  origem: '',
  destino: '',
  tipo_transporte: 'autocarro',
  data: '',
  hora_partida: '',
  hora_chegada: '',
  empresa: '',
  numero_referencia: '',
  preco: '',
  observacoes: '',
  estado: 'pendente',
}

interface StorageFile {
  name: string
  updated_at: string
  metadata?: { size: number; mimetype: string }
}

export function TransportesClient({
  campo,
  transportesIniciais,
}: {
  campo: Pick<Campo, 'id' | 'nome' | 'escalao'>
  transportesIniciais: Transporte[]
}) {
  const [transportes, setTransportes] = useState<Transporte[]>(transportesIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [docsModalAberto, setDocsModalAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TransporteFormData>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState<{ id: string; desc: string } | null>(null)
  const [ficheiros, setFicheiros] = useState<StorageFile[]>([])
  const [loadingFicheiros, setLoadingFicheiros] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [docsTransporteId, setDocsTransporteId] = useState<string | null>(null)
  const supabase = createClient()

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditId(null)
    setModalAberto(true)
  }

  function abrirEditar(t: Transporte) {
    setForm({
      sentido: t.sentido,
      origem: t.origem,
      destino: t.destino,
      tipo_transporte: t.tipo_transporte,
      data: t.data ?? '',
      hora_partida: t.hora_partida ?? '',
      hora_chegada: t.hora_chegada ?? '',
      empresa: t.empresa ?? '',
      numero_referencia: t.numero_referencia ?? '',
      preco: t.preco?.toString() ?? '',
      observacoes: t.observacoes ?? '',
      estado: t.estado,
    })
    setEditId(t.id)
    setModalAberto(true)
  }

  async function guardar() {
    if (!form.origem.trim() || !form.destino.trim()) return
    setSaving(true)
    const payload = {
      campo_id: campo.id,
      sentido: form.sentido,
      origem: form.origem.trim(),
      destino: form.destino.trim(),
      tipo_transporte: form.tipo_transporte,
      data: form.data || null,
      hora_partida: form.hora_partida || null,
      hora_chegada: form.hora_chegada || null,
      empresa: form.empresa.trim() || null,
      numero_referencia: form.numero_referencia.trim() || null,
      preco: form.preco ? parseFloat(form.preco) : null,
      observacoes: form.observacoes.trim() || null,
      estado: form.estado,
    }
    try {
      if (editId) {
        const { data, error } = await supabase
          .from('transportes').update(payload).eq('id', editId).select('*').single()
        if (error) throw error
        setTransportes((prev) => prev.map((t) => (t.id === editId ? (data as Transporte) : t)))
        toast.success('Transporte atualizado')
      } else {
        const { data, error } = await supabase
          .from('transportes').insert(payload).select('*').single()
        if (error) throw error
        setTransportes((prev) => [...prev, data as Transporte])
        toast.success('Transporte criado')
      }
      setModalAberto(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function apagarConfirmado() {
    if (!confirmarApagar) return
    const { error } = await supabase.from('transportes').delete().eq('id', confirmarApagar.id)
    if (error) { toast.error('Erro ao apagar'); return }
    // remove ficheiros do storage
    const { data: files } = await supabase.storage
      .from('transportes')
      .list(`${campo.id}/${confirmarApagar.id}`)
    if (files && files.length > 0) {
      const paths = files.map((f) => `${campo.id}/${confirmarApagar.id}/${f.name}`)
      await supabase.storage.from('transportes').remove(paths)
    }
    setTransportes((prev) => prev.filter((t) => t.id !== confirmarApagar.id))
    toast.success('Transporte apagado')
    setConfirmarApagar(null)
  }

  const carregarFicheiros = useCallback(async (transporteId: string) => {
    setLoadingFicheiros(true)
    const { data, error } = await supabase.storage
      .from('transportes')
      .list(`${campo.id}/${transporteId}`, { sortBy: { column: 'name', order: 'asc' } })
    if (error) { toast.error('Erro ao carregar documentos'); setLoadingFicheiros(false); return }
    setFicheiros((data ?? []) as StorageFile[])
    setLoadingFicheiros(false)
  }, [supabase, campo.id])

  async function abrirDocs(t: Transporte) {
    setDocsTransporteId(t.id)
    setFicheiros([])
    setDocsModalAberto(true)
    await carregarFicheiros(t.id)
  }

  async function uploadFicheiro(e: React.ChangeEvent<HTMLInputElement>) {
    if (!docsTransporteId || !e.target.files?.[0]) return
    const file = e.target.files[0]
    e.target.value = ''
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${campo.id}/${docsTransporteId}/${safeName}`
    setUploadingFile(true)
    const { error } = await supabase.storage.from('transportes').upload(path, file, { upsert: true })
    if (error) { toast.error(`Erro ao carregar: ${error.message}`); setUploadingFile(false); return }
    toast.success('Documento carregado')
    await carregarFicheiros(docsTransporteId)
    setUploadingFile(false)
  }

  async function downloadFicheiro(fileName: string) {
    if (!docsTransporteId) return
    const path = `${campo.id}/${docsTransporteId}/${fileName}`
    const { data, error } = await supabase.storage
      .from('transportes')
      .createSignedUrl(path, 3600)
    if (error) { toast.error('Erro ao gerar link'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function apagarFicheiro(fileName: string) {
    if (!docsTransporteId) return
    const path = `${campo.id}/${docsTransporteId}/${fileName}`
    const { error } = await supabase.storage.from('transportes').remove([path])
    if (error) { toast.error('Erro ao apagar documento'); return }
    setFicheiros((prev) => prev.filter((f) => f.name !== fileName))
    toast.success('Documento apagado')
  }

  function formatHora(hora: string | null | undefined) {
    if (!hora) return null
    return hora.substring(0, 5)
  }

  function formatData(data: string | null | undefined) {
    if (!data) return null
    const d = new Date(data + 'T00:00:00')
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  const transportesAtivos = transportes.filter((t) => t.estado !== 'cancelado')
  const transportesCancelados = transportes.filter((t) => t.estado === 'cancelado')

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F4]">
      {/* Header */}
      <div className="bg-white border-b border-[#E7E8D1] px-4 py-3 flex items-center gap-3">
        <Link
          href={`/campo/${campo.id}/adjuntos`}
          className="p-2 -ml-2 rounded-lg hover:bg-[#E7E8D1] transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-[#36454F]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[#36454F] truncate">Transportes</h1>
          <p className="text-xs text-gray-500 truncate">{campo.nome}</p>
        </div>
        <Button onClick={abrirNovo} size="sm" className="gap-1 bg-[#2D5016] hover:bg-[#2D5016]/90 shrink-0">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-3">
        {transportes.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <div className="text-5xl">🚌</div>
            <p className="font-medium">Sem transportes registados</p>
            <p className="text-sm">Clica em &quot;Novo&quot; para adicionar o primeiro</p>
          </div>
        ) : (
          <>
            {transportesAtivos.map((t) => (
              <TransporteCard
                key={t.id}
                transporte={t}
                onEditar={() => abrirEditar(t)}
                onDocs={() => abrirDocs(t)}
                onApagar={() => setConfirmarApagar({ id: t.id, desc: `${t.origem} → ${t.destino}` })}
                formatHora={formatHora}
                formatData={formatData}
              />
            ))}
            {transportesCancelados.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2 px-1">
                  Cancelados
                </p>
                {transportesCancelados.map((t) => (
                  <TransporteCard
                    key={t.id}
                    transporte={t}
                    onEditar={() => abrirEditar(t)}
                    onDocs={() => abrirDocs(t)}
                    onApagar={() => setConfirmarApagar({ id: t.id, desc: `${t.origem} → ${t.destino}` })}
                    formatHora={formatHora}
                    formatData={formatData}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal edição / criação */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar transporte' : 'Novo transporte'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sentido</Label>
                <Select value={form.sentido} onValueChange={(v) => setForm((f) => ({ ...f, sentido: v as TransporteSentido }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(SENTIDO_LABELS) as [TransporteSentido, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.tipo_transporte} onValueChange={(v) => setForm((f) => ({ ...f, tipo_transporte: v as TransporteTipo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_TRANSPORTE_LABELS) as [TransporteTipo, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{TIPO_TRANSPORTE_EMOJI[v]} {l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Origem *</Label>
                <Input placeholder="Lisboa" value={form.origem}
                  onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Destino *</Label>
                <Input placeholder="Fátima" value={form.destino}
                  onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Partida</Label>
                <Input type="time" value={form.hora_partida}
                  onChange={(e) => setForm((f) => ({ ...f, hora_partida: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Chegada</Label>
                <Input type="time" value={form.hora_chegada}
                  onChange={(e) => setForm((f) => ({ ...f, hora_chegada: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Empresa <span className="text-xs text-gray-400">(opcional)</span></Label>
                <Input placeholder="Rede Expressos" value={form.empresa}
                  onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Referência <span className="text-xs text-gray-400">(opcional)</span></Label>
                <Input placeholder="ABC123" value={form.numero_referencia}
                  onChange={(e) => setForm((f) => ({ ...f, numero_referencia: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Preço <span className="text-xs text-gray-400">(€, opcional)</span></Label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.preco}
                  onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v as TransporteEstado }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ESTADO_LABELS) as [TransporteEstado, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} placeholder="Paragem em..." value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button
              onClick={guardar}
              disabled={saving || !form.origem.trim() || !form.destino.trim()}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90"
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal documentos */}
      <Dialog open={docsModalAberto} onOpenChange={setDocsModalAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className={cn(
              'flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
              uploadingFile
                ? 'border-[#E7E8D1] text-gray-300 pointer-events-none'
                : 'border-[#E7E8D1] text-gray-400 hover:border-[#2D5016] hover:text-[#2D5016]'
            )}>
              <Upload className="h-4 w-4" />
              <span className="text-sm">{uploadingFile ? 'A carregar...' : 'Carregar PDF ou imagem'}</span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                disabled={uploadingFile}
                onChange={uploadFicheiro}
              />
            </label>

            {loadingFicheiros ? (
              <p className="text-sm text-gray-400 text-center py-4">A carregar...</p>
            ) : ficheiros.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sem documentos</p>
            ) : (
              <div className="space-y-1.5">
                {ficheiros.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 p-2 rounded-lg bg-[#F8F8F4] border border-[#E7E8D1]">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-[#36454F] flex-1 truncate">{f.name}</span>
                    <button
                      onClick={() => downloadFicheiro(f.name)}
                      className="p-1 rounded hover:bg-white text-gray-400 hover:text-[#2D5016] transition-colors"
                      title="Abrir / descarregar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => apagarFicheiro(f.name)}
                      className="p-1 rounded hover:bg-white text-gray-300 hover:text-[#F96167] transition-colors"
                      title="Apagar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocsModalAberto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação apagar */}
      <Dialog open={!!confirmarApagar} onOpenChange={(o) => { if (!o) setConfirmarApagar(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar transporte</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Tens a certeza? Vai apagar <strong>{confirmarApagar?.desc}</strong> e todos os seus documentos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarApagar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={apagarConfirmado}>Apagar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TransporteCard({
  transporte: t,
  onEditar,
  onDocs,
  onApagar,
  formatHora,
  formatData,
}: {
  transporte: Transporte
  onEditar: () => void
  onDocs: () => void
  onApagar: () => void
  formatHora: (h: string | null | undefined) => string | null
  formatData: (d: string | null | undefined) => string | null
}) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-[#E7E8D1] p-4 space-y-3',
      t.estado === 'cancelado' && 'opacity-60'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{TIPO_TRANSPORTE_EMOJI[t.tipo_transporte]}</span>
          <div className="min-w-0">
            <p className="font-bold text-[#36454F] truncate">{t.origem} → {t.destino}</p>
            <p className="text-xs text-gray-500">{TIPO_TRANSPORTE_LABELS[t.tipo_transporte]} · {SENTIDO_LABELS[t.sentido]}</p>
          </div>
        </div>
        <Badge className={cn('shrink-0 border text-xs', ESTADO_CORES[t.estado])}>
          {ESTADO_LABELS[t.estado]}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {t.data && <span>📅 {formatData(t.data)}</span>}
        {t.hora_partida && (
          <span>
            🕐 {formatHora(t.hora_partida)}
            {t.hora_chegada ? ` → ${formatHora(t.hora_chegada)}` : ''}
          </span>
        )}
        {t.empresa && <span>🏢 {t.empresa}</span>}
        {t.numero_referencia && <span>🔖 {t.numero_referencia}</span>}
        {t.preco != null && <span>💶 {Number(t.preco).toFixed(2)}€</span>}
      </div>

      {t.observacoes && (
        <p className="text-xs text-gray-400 italic">{t.observacoes}</p>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-[#E7E8D1]">
        <button onClick={onEditar} className="text-xs text-gray-400 hover:text-[#B85042] transition-colors">
          Editar
        </button>
        <span className="text-gray-200">·</span>
        <button onClick={onDocs} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#2D5016] transition-colors">
          <FileText className="h-3 w-3" />
          Documentos
        </button>
        <span className="text-gray-200">·</span>
        <button onClick={onApagar} className="text-xs text-[#F96167] hover:opacity-70 transition-opacity ml-auto">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
