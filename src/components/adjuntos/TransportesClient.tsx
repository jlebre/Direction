'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, FileText, Upload, Share2, X, ChevronLeft, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
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
import type { Transporte, TransporteSegmento, TransporteSentido, TransporteTipo, TransporteEstado } from '@/types/transportes'
import { TIPO_TRANSPORTE_LABELS, TIPO_TRANSPORTE_EMOJI, ESTADO_LABELS, ESTADO_CORES, SLOT_KEY_ORDER } from '@/types/transportes'
import { cn, parseMoney } from '@/lib/utils'

interface TransporteFormData {
  sentido: 'ida' | 'volta'
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

interface SegmentoFormData {
  tipo_transporte: TransporteTipo
  origem: string
  destino: string
  data: string
  hora_partida: string
  hora_chegada: string
  operador: string
  numero_referencia: string
}

const FORM_VAZIO: TransporteFormData = {
  sentido: 'ida', origem: '', destino: '', tipo_transporte: 'autocarro',
  data: '', hora_partida: '', hora_chegada: '', empresa: '',
  numero_referencia: '', preco: '', observacoes: '', estado: 'pendente',
}

const SEG_VAZIO: SegmentoFormData = {
  tipo_transporte: 'autocarro', origem: '', destino: '',
  data: '', hora_partida: '', hora_chegada: '', operador: '', numero_referencia: '',
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

  // Modal principal
  const [modalAberto, setModalAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TransporteFormData>(FORM_VAZIO)
  const [sentidoFixo, setSentidoFixo] = useState<'ida' | 'volta' | null>(null)
  const [saving, setSaving] = useState(false)

  // Transporte combinado
  const [isCombinado, setIsCombinado] = useState(false)
  const [segmentosTemp, setSegmentosTemp] = useState<SegmentoFormData[]>([])
  const [segForm, setSegForm] = useState<SegmentoFormData>(SEG_VAZIO)
  const [editandoSegIdx, setEditandoSegIdx] = useState<number | null>(null)
  const [mostraSegForm, setMostraSegForm] = useState(false)
  const [loadingSegmentos, setLoadingSegmentos] = useState(false)

  // Confirmar apagar / resetar
  const [confirmarApagar, setConfirmarApagar] = useState<{ id: string; desc: string } | null>(null)
  const [confirmarResetar, setConfirmarResetar] = useState<{ id: string; desc: string } | null>(null)

  // Docs modal
  const [docsModalAberto, setDocsModalAberto] = useState(false)
  const [docsTransporteId, setDocsTransporteId] = useState<string | null>(null)
  const [ficheiros, setFicheiros] = useState<StorageFile[]>([])
  const [loadingFicheiros, setLoadingFicheiros] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  const supabase = createClient()

  // Agrupamento
  const idaSlots = transportes
    .filter((t) => t.sentido === 'ida' && t.is_slot_padrao)
    .sort((a, b) => (SLOT_KEY_ORDER[a.slot_key ?? ''] ?? 99) - (SLOT_KEY_ORDER[b.slot_key ?? ''] ?? 99))
  const idaExtras = transportes
    .filter((t) => (t.sentido === 'ida' || t.sentido === 'ida_volta') && !t.is_slot_padrao)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const voltaSlots = transportes
    .filter((t) => t.sentido === 'volta' && t.is_slot_padrao)
    .sort((a, b) => (SLOT_KEY_ORDER[a.slot_key ?? ''] ?? 99) - (SLOT_KEY_ORDER[b.slot_key ?? ''] ?? 99))
  const voltaExtras = transportes
    .filter((t) => t.sentido === 'volta' && !t.is_slot_padrao)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  function resetModal() {
    setForm(FORM_VAZIO)
    setIsCombinado(false)
    setSegmentosTemp([])
    setSegForm(SEG_VAZIO)
    setEditandoSegIdx(null)
    setMostraSegForm(false)
    setEditId(null)
    setSentidoFixo(null)
  }

  async function carregarSegmentos(transporteId: string): Promise<SegmentoFormData[]> {
    const { data } = await supabase
      .from('transporte_segmentos')
      .select('*')
      .eq('transporte_id', transporteId)
      .order('ordem')
    return (data ?? []).map((s: TransporteSegmento) => ({
      tipo_transporte: s.tipo_transporte,
      origem: s.origem,
      destino: s.destino,
      data: s.data ?? '',
      hora_partida: s.hora_partida ?? '',
      hora_chegada: s.hora_chegada ?? '',
      operador: s.operador ?? '',
      numero_referencia: s.numero_referencia ?? '',
    }))
  }

  async function abrirConfigurar(t: Transporte) {
    resetModal()
    setForm({ ...FORM_VAZIO, sentido: t.sentido === 'ida' ? 'ida' : 'volta', origem: t.origem, destino: t.destino, estado: 'pendente' })
    setSentidoFixo(t.sentido === 'ida' ? 'ida' : 'volta')
    setEditId(t.id)
    setIsCombinado(false)
    setModalAberto(true)
  }

  async function abrirEditar(t: Transporte) {
    resetModal()
    setForm({
      sentido: t.sentido === 'volta' ? 'volta' : 'ida',
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
      estado: t.estado === 'por_configurar' ? 'pendente' : t.estado,
    })
    setSentidoFixo(t.is_slot_padrao ? (t.sentido === 'ida' ? 'ida' : 'volta') : null)
    setEditId(t.id)
    setIsCombinado(t.is_combinado)
    setModalAberto(true)
    if (t.is_combinado) {
      setLoadingSegmentos(true)
      const segs = await carregarSegmentos(t.id)
      setSegmentosTemp(segs)
      setLoadingSegmentos(false)
    }
  }

  function abrirNovoExtra(sentido: 'ida' | 'volta') {
    resetModal()
    setForm({ ...FORM_VAZIO, sentido, estado: 'pendente' })
    setModalAberto(true)
  }

  async function guardar() {
    if (!form.origem.trim() || !form.destino.trim()) return
    if (isCombinado && segmentosTemp.length === 0) {
      toast.error('Adiciona pelo menos um segmento ao transporte combinado.')
      return
    }
    setSaving(true)

    const primeiroSeg = isCombinado ? segmentosTemp[0] : null
    const ultimoSeg = isCombinado ? segmentosTemp[segmentosTemp.length - 1] : null

    const payload = {
      campo_id: campo.id,
      sentido: form.sentido as TransporteSentido,
      origem: form.origem.trim(),
      destino: form.destino.trim(),
      tipo_transporte: isCombinado ? ('outro' as const) : form.tipo_transporte,
      data: isCombinado ? (primeiroSeg?.data || null) : (form.data || null),
      hora_partida: isCombinado ? (primeiroSeg?.hora_partida || null) : (form.hora_partida || null),
      hora_chegada: isCombinado ? (ultimoSeg?.hora_chegada || null) : (form.hora_chegada || null),
      empresa: isCombinado ? null : (form.empresa.trim() || null),
      numero_referencia: isCombinado ? null : (form.numero_referencia.trim() || null),
      preco: form.preco ? (parseMoney(form.preco) ?? null) : null,
      observacoes: form.observacoes.trim() || null,
      estado: form.estado,
      is_combinado: isCombinado,
    }

    try {
      let savedId = editId

      if (editId) {
        const { data, error } = await supabase.from('transportes').update(payload).eq('id', editId).select('*').single()
        if (error) throw error
        setTransportes((prev) => prev.map((t) => (t.id === editId ? (data as Transporte) : t)))
      } else {
        const { data, error } = await supabase.from('transportes').insert({ ...payload, is_slot_padrao: false }).select('*').single()
        if (error) throw error
        savedId = (data as Transporte).id
        setTransportes((prev) => [...prev, data as Transporte])
      }

      if (isCombinado && savedId) {
        await supabase.from('transporte_segmentos').delete().eq('transporte_id', savedId)
        if (segmentosTemp.length > 0) {
          const { error: segErr } = await supabase.from('transporte_segmentos').insert(
            segmentosTemp.map((s, i) => ({
              transporte_id: savedId,
              campo_id: campo.id,
              tipo_transporte: s.tipo_transporte,
              origem: s.origem.trim(),
              destino: s.destino.trim(),
              data: s.data || null,
              hora_partida: s.hora_partida || null,
              hora_chegada: s.hora_chegada || null,
              operador: s.operador.trim() || null,
              numero_referencia: s.numero_referencia.trim() || null,
              ordem: i + 1,
            }))
          )
          if (segErr) toast.error('Segmentos guardados com erro: ' + segErr.message)
        }
      }

      toast.success('Transporte guardado')
      setModalAberto(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function resetarSlotConfirmado() {
    if (!confirmarResetar) return
    const { error } = await supabase.from('transportes').update({
      estado: 'por_configurar', tipo_transporte: 'autocarro', is_combinado: false,
      data: null, hora_partida: null, hora_chegada: null,
      empresa: null, numero_referencia: null, preco: null, observacoes: null,
    }).eq('id', confirmarResetar.id)
    if (error) { toast.error('Erro ao resetar'); return }
    await supabase.from('transporte_segmentos').delete().eq('transporte_id', confirmarResetar.id)
    setTransportes((prev) => prev.map((t) =>
      t.id === confirmarResetar.id
        ? { ...t, estado: 'por_configurar' as const, tipo_transporte: 'autocarro' as const, is_combinado: false, data: null, hora_partida: null, hora_chegada: null, empresa: null, numero_referencia: null, preco: null, observacoes: null }
        : t
    ))
    toast.success('Slot resetado')
    setConfirmarResetar(null)
  }

  async function apagarConfirmado() {
    if (!confirmarApagar) return
    const { error } = await supabase.from('transportes').delete().eq('id', confirmarApagar.id)
    if (error) { toast.error('Erro ao apagar'); return }
    const { data: files } = await supabase.storage.from('transportes').list(`${campo.id}/${confirmarApagar.id}`)
    if (files && files.length > 0) {
      await supabase.storage.from('transportes').remove(files.map((f) => `${campo.id}/${confirmarApagar.id}/${f.name}`))
    }
    setTransportes((prev) => prev.filter((t) => t.id !== confirmarApagar.id))
    toast.success('Transporte apagado')
    setConfirmarApagar(null)
  }

  const carregarFicheiros = useCallback(async (transporteId: string) => {
    setLoadingFicheiros(true)
    const { data, error } = await supabase.storage.from('transportes').list(`${campo.id}/${transporteId}`, { sortBy: { column: 'name', order: 'asc' } })
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
    setUploadingFile(true)
    const { error } = await supabase.storage.from('transportes').upload(`${campo.id}/${docsTransporteId}/${safeName}`, file, { upsert: true })
    if (error) { toast.error(`Erro: ${error.message}`); setUploadingFile(false); return }
    toast.success('Documento carregado')
    await carregarFicheiros(docsTransporteId)
    setUploadingFile(false)
  }

  async function abrirOuPartilhar(fileName: string) {
    if (!docsTransporteId) return
    const { data, error } = await supabase.storage.from('transportes').createSignedUrl(`${campo.id}/${docsTransporteId}/${fileName}`, 3600)
    if (error) { toast.error('Erro ao gerar link'); return }
    if (navigator.share) {
      try {
        await navigator.share({ title: fileName, url: data.signedUrl })
        return
      } catch {
        // AbortError (user dismissed) or not supported — fall through
      }
    }
    window.open(data.signedUrl, '_blank')
  }

  async function apagarFicheiro(fileName: string) {
    if (!docsTransporteId) return
    const { error } = await supabase.storage.from('transportes').remove([`${campo.id}/${docsTransporteId}/${fileName}`])
    if (error) { toast.error('Erro ao apagar documento'); return }
    setFicheiros((prev) => prev.filter((f) => f.name !== fileName))
    toast.success('Documento apagado')
  }

  function formatHora(h: string | null | undefined) { return h ? h.substring(0, 5) : null }
  function formatData(d: string | null | undefined) {
    if (!d) return null
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  const estadosForm: TransporteEstado[] = ['pendente', 'confirmado', 'concluido', 'cancelado']

  // Segment helpers
  function adicionarSegmento() {
    if (!segForm.origem.trim() || !segForm.destino.trim()) return
    if (editandoSegIdx !== null) {
      setSegmentosTemp((prev) => prev.map((s, i) => i === editandoSegIdx ? segForm : s))
    } else {
      setSegmentosTemp((prev) => [...prev, segForm])
    }
    setSegForm(SEG_VAZIO)
    setEditandoSegIdx(null)
    setMostraSegForm(false)
  }

  function moverSegmento(idx: number, dir: -1 | 1) {
    const novo = [...segmentosTemp]
    const alvo = idx + dir
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[idx], novo[alvo]] = [novo[alvo], novo[idx]]
    setSegmentosTemp(novo)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F4]">
      {/* Header */}
      <div className="bg-white border-b border-[#E7E8D1] px-4 py-3 flex items-center gap-3">
        <Link href={`/campo/${campo.id}/adjuntos`} className="p-2 -ml-2 rounded-lg hover:bg-[#E7E8D1] transition-colors">
          <ChevronLeft className="h-5 w-5 text-[#36454F]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[#36454F] truncate">Transportes</h1>
          <p className="text-xs text-gray-500 truncate">{campo.nome}</p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="bg-white border-b border-[#E7E8D1] px-4">
        <div className="max-w-lg mx-auto flex gap-1">
          <Link href={`/campo/${campo.id}/adjuntos`} className="text-sm text-gray-500 px-4 py-3 hover:text-gray-800 transition-colors">Dashboard</Link>
          <span className="text-sm font-semibold px-4 py-3 border-b-2 border-[#2D5016] text-[#2D5016]">Transportes</span>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
        {/* IDA */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">IDA</h2>
          <div className="space-y-3">
            {idaSlots.map((t) => (
              <SlotCard key={t.id} transporte={t}
                onConfigurar={() => abrirConfigurar(t)} onEditar={() => abrirEditar(t)}
                onDocs={() => abrirDocs(t)} onResetar={() => setConfirmarResetar({ id: t.id, desc: `${t.origem} → ${t.destino}` })}
                formatHora={formatHora} formatData={formatData} />
            ))}
            {idaExtras.map((t) => (
              <ExtraCard key={t.id} transporte={t}
                onEditar={() => abrirEditar(t)} onDocs={() => abrirDocs(t)}
                onApagar={() => setConfirmarApagar({ id: t.id, desc: `${t.origem} → ${t.destino}` })}
                formatHora={formatHora} formatData={formatData} />
            ))}
            <BotaoExtra onClick={() => abrirNovoExtra('ida')} label="Adicionar origem extra" />
          </div>
        </section>

        {/* VOLTA */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">VOLTA</h2>
          <div className="space-y-3">
            {voltaSlots.map((t) => (
              <SlotCard key={t.id} transporte={t}
                onConfigurar={() => abrirConfigurar(t)} onEditar={() => abrirEditar(t)}
                onDocs={() => abrirDocs(t)} onResetar={() => setConfirmarResetar({ id: t.id, desc: `${t.origem} → ${t.destino}` })}
                formatHora={formatHora} formatData={formatData} />
            ))}
            {voltaExtras.map((t) => (
              <ExtraCard key={t.id} transporte={t}
                onEditar={() => abrirEditar(t)} onDocs={() => abrirDocs(t)}
                onApagar={() => setConfirmarApagar({ id: t.id, desc: `${t.origem} → ${t.destino}` })}
                formatHora={formatHora} formatData={formatData} />
            ))}
            <BotaoExtra onClick={() => abrirNovoExtra('volta')} label="Adicionar destino extra" />
          </div>
        </section>
      </div>

      {/* Modal principal */}
      <Dialog open={modalAberto} onOpenChange={(open) => { if (!open) resetModal(); setModalAberto(open) }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar transporte' : 'Novo transporte'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Toggle Simples / Combinado */}
            <div className="space-y-1">
              <Label>Tipo de deslocação</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setIsCombinado(false); setSegmentosTemp([]) }}
                  className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                    !isCombinado ? 'bg-[#2D5016] text-white border-[#2D5016]' : 'bg-white text-gray-600 border-[#E7E8D1] hover:border-[#2D5016]')}>
                  Simples
                </button>
                <button type="button" onClick={() => setIsCombinado(true)}
                  className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                    isCombinado ? 'bg-[#2D5016] text-white border-[#2D5016]' : 'bg-white text-gray-600 border-[#E7E8D1] hover:border-[#2D5016]')}>
                  Combinado
                </button>
              </div>
            </div>

            {/* Sentido (apenas para extras) */}
            {!sentidoFixo && (
              <div className="space-y-1">
                <Label>Sentido</Label>
                <div className="flex gap-2">
                  {(['ida', 'volta'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, sentido: s }))}
                      className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                        form.sentido === s ? 'bg-[#2D5016] text-white border-[#2D5016]' : 'bg-white text-gray-600 border-[#E7E8D1] hover:border-[#2D5016]')}>
                      {s === 'ida' ? 'Ida' : 'Volta'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Origem / Destino */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Origem *</Label>
                <Input placeholder="Lisboa" value={form.origem}
                  onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                  readOnly={!!editId && !!sentidoFixo}
                  className={editId && sentidoFixo ? 'bg-gray-50 text-gray-500' : ''} />
              </div>
              <div className="space-y-1">
                <Label>Destino *</Label>
                <Input placeholder="Campo" value={form.destino}
                  onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                  readOnly={!!editId && !!sentidoFixo}
                  className={editId && sentidoFixo ? 'bg-gray-50 text-gray-500' : ''} />
              </div>
            </div>

            {/* Campos simples */}
            {!isCombinado && (
              <>
                <div className="space-y-1">
                  <Label>Tipo de transporte</Label>
                  <Select value={form.tipo_transporte} onValueChange={(v) => setForm((f) => ({ ...f, tipo_transporte: v as TransporteTipo }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(TIPO_TRANSPORTE_LABELS) as [TransporteTipo, string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{TIPO_TRANSPORTE_EMOJI[v]} {l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>Data</Label>
                    <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Partida</Label>
                    <Input type="time" value={form.hora_partida} onChange={(e) => setForm((f) => ({ ...f, hora_partida: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Chegada</Label>
                    <Input type="time" value={form.hora_chegada} onChange={(e) => setForm((f) => ({ ...f, hora_chegada: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Operador</Label>
                    <Input placeholder="Rede Expressos" value={form.empresa} onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Referência</Label>
                    <Input placeholder="ABC123" value={form.numero_referencia} onChange={(e) => setForm((f) => ({ ...f, numero_referencia: e.target.value }))} /></div>
                </div>
              </>
            )}

            {/* Segmentos (modo combinado) */}
            {isCombinado && (
              <div className="space-y-2">
                <Label>Segmentos da viagem</Label>
                {loadingSegmentos ? (
                  <p className="text-sm text-gray-400 py-2">A carregar segmentos...</p>
                ) : (
                  <>
                    {segmentosTemp.length === 0 && !mostraSegForm && (
                      <p className="text-xs text-gray-400 py-1">Sem segmentos. Adiciona o primeiro abaixo.</p>
                    )}
                    <div className="space-y-1.5">
                      {segmentosTemp.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-[#F8F8F4] rounded-lg border border-[#E7E8D1] text-xs">
                          <span className="text-base shrink-0">{TIPO_TRANSPORTE_EMOJI[s.tipo_transporte]}</span>
                          <span className="flex-1 font-medium min-w-0 truncate">{s.origem} → {s.destino}</span>
                          {s.hora_partida && <span className="text-gray-500 shrink-0">{s.hora_partida.substring(0, 5)}{s.hora_chegada ? `→${s.hora_chegada.substring(0, 5)}` : ''}</span>}
                          <div className="flex gap-0.5 shrink-0">
                            <button type="button" onClick={() => moverSegmento(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-white disabled:opacity-30">
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => moverSegmento(i, 1)} disabled={i === segmentosTemp.length - 1} className="p-1 rounded hover:bg-white disabled:opacity-30">
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => { setSegForm(s); setEditandoSegIdx(i); setMostraSegForm(true) }} className="p-1 rounded hover:bg-white text-gray-400 hover:text-[#B85042]">
                              ✏️
                            </button>
                            <button type="button" onClick={() => setSegmentosTemp((prev) => prev.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-white text-gray-300 hover:text-[#F96167]">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!mostraSegForm ? (
                      <button type="button" onClick={() => { setSegForm(SEG_VAZIO); setEditandoSegIdx(null); setMostraSegForm(true) }}
                        className="text-sm text-[#2D5016] hover:opacity-70 transition-opacity font-medium">
                        + Adicionar segmento
                      </button>
                    ) : (
                      <div className="border border-[#E7E8D1] rounded-xl p-3 space-y-2 bg-white">
                        <p className="text-xs font-semibold text-gray-600">{editandoSegIdx !== null ? `Editar segmento ${editandoSegIdx + 1}` : 'Novo segmento'}</p>
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo</Label>
                          <Select value={segForm.tipo_transporte} onValueChange={(v) => setSegForm((f) => ({ ...f, tipo_transporte: v as TransporteTipo }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.entries(TIPO_TRANSPORTE_LABELS) as [TransporteTipo, string][]).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{TIPO_TRANSPORTE_EMOJI[v]} {l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><Label className="text-xs">Origem *</Label>
                            <Input className="h-8 text-sm" placeholder="Lisboa" value={segForm.origem} onChange={(e) => setSegForm((f) => ({ ...f, origem: e.target.value }))} /></div>
                          <div className="space-y-1"><Label className="text-xs">Destino *</Label>
                            <Input className="h-8 text-sm" placeholder="Coimbra B" value={segForm.destino} onChange={(e) => setSegForm((f) => ({ ...f, destino: e.target.value }))} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1"><Label className="text-xs">Data</Label>
                            <Input className="h-8 text-sm" type="date" value={segForm.data} onChange={(e) => setSegForm((f) => ({ ...f, data: e.target.value }))} /></div>
                          <div className="space-y-1"><Label className="text-xs">Partida</Label>
                            <Input className="h-8 text-sm" type="time" value={segForm.hora_partida} onChange={(e) => setSegForm((f) => ({ ...f, hora_partida: e.target.value }))} /></div>
                          <div className="space-y-1"><Label className="text-xs">Chegada</Label>
                            <Input className="h-8 text-sm" type="time" value={segForm.hora_chegada} onChange={(e) => setSegForm((f) => ({ ...f, hora_chegada: e.target.value }))} /></div>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Operador</Label>
                          <Input className="h-8 text-sm" placeholder="CP, Rede Expressos..." value={segForm.operador} onChange={(e) => setSegForm((f) => ({ ...f, operador: e.target.value }))} /></div>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => { setMostraSegForm(false); setEditandoSegIdx(null) }}>Cancelar</Button>
                          <Button type="button" size="sm"
                            disabled={!segForm.origem.trim() || !segForm.destino.trim()}
                            className="bg-[#2D5016] hover:bg-[#2D5016]/90"
                            onClick={adicionarSegmento}>
                            {editandoSegIdx !== null ? 'Guardar' : 'Adicionar'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Preço + Estado (comum) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Preço <span className="text-xs text-gray-400">(€)</span></Label>
                <Input type="text" inputMode="decimal" placeholder="0,00" value={form.preco}
                  onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v as TransporteEstado }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {estadosForm.map((v) => <SelectItem key={v} value={v}>{ESTADO_LABELS[v]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1"><Label>Observações</Label>
              <Textarea rows={2} placeholder="Notas adicionais..." value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetModal(); setModalAberto(false) }}>Cancelar</Button>
            <Button type="button" onClick={guardar}
              disabled={saving || !form.origem.trim() || !form.destino.trim() || (isCombinado && mostraSegForm)}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal documentos */}
      <Dialog open={docsModalAberto} onOpenChange={setDocsModalAberto}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documentos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className={cn('flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
              uploadingFile ? 'border-[#E7E8D1] text-gray-300 pointer-events-none' : 'border-[#E7E8D1] text-gray-400 hover:border-[#2D5016] hover:text-[#2D5016]')}>
              <Upload className="h-4 w-4" />
              <span className="text-sm">{uploadingFile ? 'A carregar...' : 'Carregar PDF ou imagem'}</span>
              <input type="file" accept=".pdf,image/*" className="hidden" disabled={uploadingFile} onChange={uploadFicheiro} />
            </label>
            {loadingFicheiros ? <p className="text-sm text-gray-400 text-center py-4">A carregar...</p>
              : ficheiros.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Sem documentos</p>
              : (
                <div className="space-y-1.5">
                  {ficheiros.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 p-2 rounded-lg bg-[#F8F8F4] border border-[#E7E8D1]">
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-[#36454F] flex-1 truncate">{f.name}</span>
                      <button type="button" onClick={() => abrirOuPartilhar(f.name)} title="Abrir / Partilhar" className="p-1 rounded hover:bg-white text-gray-400 hover:text-[#2D5016] transition-colors">
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => apagarFicheiro(f.name)} className="p-1 rounded hover:bg-white text-gray-300 hover:text-[#F96167] transition-colors"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDocsModalAberto(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar apagar */}
      <Dialog open={!!confirmarApagar} onOpenChange={(o) => { if (!o) setConfirmarApagar(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader><DialogTitle>Apagar transporte</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Vai apagar <strong>{confirmarApagar?.desc}</strong> e todos os documentos. Tens a certeza?</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarApagar(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={apagarConfirmado}>Apagar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar resetar */}
      <Dialog open={!!confirmarResetar} onOpenChange={(o) => { if (!o) setConfirmarResetar(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader><DialogTitle>Resetar slot</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Remove toda a informação de <strong>{confirmarResetar?.desc}</strong> e volta a &quot;Por configurar&quot;. Tem a certeza?</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarResetar(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={resetarSlotConfirmado}>Resetar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Sub-componentes ---

function BotaoExtra({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#E7E8D1] text-sm text-gray-400 hover:border-[#2D5016] hover:text-[#2D5016] transition-colors">
      <Plus className="h-4 w-4" /> {label}
    </button>
  )
}

function SlotCard({ transporte: t, onConfigurar, onEditar, onDocs, onResetar, formatHora, formatData }: {
  transporte: Transporte
  onConfigurar: () => void
  onEditar: () => void
  onDocs: () => void
  onResetar: () => void
  formatHora: (h: string | null | undefined) => string | null
  formatData: (d: string | null | undefined) => string | null
}) {
  const porConfigurar = t.estado === 'por_configurar'

  return (
    <div className={cn('bg-white rounded-xl border border-[#E7E8D1] p-4', porConfigurar && 'border-dashed')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!porConfigurar && (
            <span className="text-xl shrink-0">{t.is_combinado ? '🔗' : TIPO_TRANSPORTE_EMOJI[t.tipo_transporte]}</span>
          )}
          <div className="min-w-0">
            <p className="font-bold text-[#36454F] truncate">{t.origem} → {t.destino}</p>
            {!porConfigurar && (
              <p className="text-xs text-gray-500">
                {t.is_combinado ? 'Combinado' : TIPO_TRANSPORTE_LABELS[t.tipo_transporte]}
              </p>
            )}
          </div>
        </div>
        <Badge className={cn('shrink-0 border text-xs', ESTADO_CORES[t.estado])}>{ESTADO_LABELS[t.estado]}</Badge>
      </div>

      {!porConfigurar && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
          {t.data && <span>📅 {formatData(t.data)}</span>}
          {t.hora_partida && <span>🕐 {formatHora(t.hora_partida)}{t.hora_chegada ? ` → ${formatHora(t.hora_chegada)}` : ''}</span>}
          {!t.is_combinado && t.empresa && <span>🏢 {t.empresa}</span>}
          {t.preco != null && <span>💶 {Number(t.preco).toFixed(2)}€</span>}
        </div>
      )}

      {t.observacoes && !porConfigurar && <p className="text-xs text-gray-400 italic mt-1">{t.observacoes}</p>}

      <div className="flex items-center gap-2 pt-3 mt-2 border-t border-[#E7E8D1]">
        {porConfigurar ? (
          <button type="button" onClick={onConfigurar} className="text-sm font-medium text-[#2D5016] hover:opacity-70 transition-opacity">Configurar →</button>
        ) : (
          <>
            <button type="button" onClick={onEditar} className="text-xs text-gray-400 hover:text-[#B85042] transition-colors">Editar</button>
            <span className="text-gray-200">·</span>
            <button type="button" onClick={onDocs} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#2D5016] transition-colors">
              <FileText className="h-3 w-3" /> Documentos
            </button>
            <span className="text-gray-200 ml-auto">·</span>
            <button type="button" onClick={onResetar} className="flex items-center gap-1 text-xs text-gray-300 hover:text-amber-500 transition-colors">
              <RotateCcw className="h-3 w-3" /> Resetar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ExtraCard({ transporte: t, onEditar, onDocs, onApagar, formatHora, formatData }: {
  transporte: Transporte
  onEditar: () => void
  onDocs: () => void
  onApagar: () => void
  formatHora: (h: string | null | undefined) => string | null
  formatData: (d: string | null | undefined) => string | null
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-[#E7E8D1] p-4', t.estado === 'cancelado' && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{t.is_combinado ? '🔗' : TIPO_TRANSPORTE_EMOJI[t.tipo_transporte]}</span>
          <div className="min-w-0">
            <p className="font-bold text-[#36454F] truncate">{t.origem} → {t.destino}</p>
            <p className="text-xs text-gray-400">Extra · {t.is_combinado ? 'Combinado' : TIPO_TRANSPORTE_LABELS[t.tipo_transporte]}</p>
          </div>
        </div>
        <Badge className={cn('shrink-0 border text-xs', ESTADO_CORES[t.estado])}>{ESTADO_LABELS[t.estado]}</Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
        {t.data && <span>📅 {formatData(t.data)}</span>}
        {t.hora_partida && <span>🕐 {formatHora(t.hora_partida)}{t.hora_chegada ? ` → ${formatHora(t.hora_chegada)}` : ''}</span>}
        {!t.is_combinado && t.empresa && <span>🏢 {t.empresa}</span>}
        {t.preco != null && <span>💶 {Number(t.preco).toFixed(2)}€</span>}
      </div>

      {t.observacoes && <p className="text-xs text-gray-400 italic mt-1">{t.observacoes}</p>}

      <div className="flex items-center gap-2 pt-3 mt-2 border-t border-[#E7E8D1]">
        <button type="button" onClick={onEditar} className="text-xs text-gray-400 hover:text-[#B85042] transition-colors">Editar</button>
        <span className="text-gray-200">·</span>
        <button type="button" onClick={onDocs} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#2D5016] transition-colors">
          <FileText className="h-3 w-3" /> Documentos
        </button>
        <button type="button" onClick={onApagar} className="ml-auto text-[#F96167] hover:opacity-70 transition-opacity">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
