'use client'

import { useState } from 'react'
import { Plus, Archive, ArchiveRestore, Pencil, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Campo, SeccaoTipo } from '@/types/shared'
import { ESCALAO_COR } from '@/types/shared'
import { cn } from '@/lib/utils'

const SECCAO_PARA_ESCALAO: Record<string, SeccaoTipo> = {
  Mosquito: 'mosquitos',
  Aranhiço: 'aranhicos',
  Melga: 'melgas',
  Tremelga: 'tremelgas',
  Camaleão: 'camaleoes',
}

interface CampoFormData {
  nome: string
  escalao: string
  ano: string
  local: string
  diretor: string
  adjunto: string
  mama: string
  pin: string
  saldo_inicial: string
  datas: string
  pre_campo: string
}

const FORM_VAZIO: CampoFormData = {
  nome: '', escalao: 'Mosquito', ano: new Date().getFullYear().toString(),
  local: '', diretor: '', adjunto: '', mama: '',
  pin: '', saldo_inicial: '0', datas: '', pre_campo: '',
}

export function CamposAdminClient({
  camposIniciais,
  escalaoOptions,
  escalaoEmoji,
  seccaoLabels,
}: {
  camposIniciais: Campo[]
  escalaoOptions: string[]
  escalaoEmoji: Record<string, string>
  seccaoLabels: Record<string, string>
}) {
  const [campos, setCampos] = useState<Campo[]>(camposIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CampoFormData>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const supabase = createClient()

  const anos = [...new Set(campos.map((c) => c.ano).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0))

  const camposFiltrados = campos.filter((c) => {
    if (c.arquivado && !mostrarArquivados) return false
    if (filtroAno !== 'todos' && c.ano?.toString() !== filtroAno) return false
    return true
  })

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditId(null)
    setModalAberto(true)
  }

  function abrirEditar(c: Campo) {
    setForm({
      nome: c.nome,
      escalao: c.escalao,
      ano: c.ano?.toString() ?? '',
      local: c.local ?? '',
      diretor: c.diretor,
      adjunto: c.adjunto,
      mama: c.mama,
      pin: c.pin ?? '',
      saldo_inicial: c.saldo_inicial.toString(),
      datas: c.datas ?? '',
      pre_campo: c.pre_campo ?? '',
    })
    setEditId(c.id)
    setModalAberto(true)
  }

  async function guardar() {
    if (!form.nome.trim() || !form.pin.trim()) return
    setSaving(true)
    const seccao = SECCAO_PARA_ESCALAO[form.escalao] ?? 'mosquitos'
    const payload = {
      nome: form.nome.trim(),
      escalao: form.escalao,
      seccao,
      ano: form.ano ? parseInt(form.ano) : null,
      local: form.local.trim() || null,
      diretor: form.diretor.trim(),
      adjunto: form.adjunto.trim(),
      mama: form.mama.trim(),
      pin: form.pin.trim(),
      saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      datas: form.datas.trim() || '',
      pre_campo: form.pre_campo.trim() || null,
    }
    try {
      if (editId) {
        const { data, error } = await supabase
          .from('campos').update(payload).eq('id', editId).select('*').single()
        if (error) throw error
        setCampos((prev) => prev.map((c) => (c.id === editId ? (data as Campo) : c)))
        toast.success('Campo atualizado')
      } else {
        const { data, error } = await supabase
          .from('campos').insert({ ...payload, setup_completo: false }).select('*').single()
        if (error) throw error
        setCampos((prev) => [...prev, data as Campo])
        toast.success('Campo criado')
      }
      setModalAberto(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleArquivar(campo: Campo) {
    const novoEstado = !campo.arquivado
    const { error } = await supabase
      .from('campos').update({ arquivado: novoEstado }).eq('id', campo.id)
    if (error) { toast.error('Erro ao arquivar'); return }
    setCampos((prev) => prev.map((c) => (c.id === campo.id ? { ...c, arquivado: novoEstado } : c)))
    toast.success(novoEstado ? 'Campo arquivado' : 'Campo restaurado')
  }

  return (
    <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
      <div className="p-4 border-b border-[#E7E8D1] flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-[#36454F]">Campos</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por ano */}
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os anos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setMostrarArquivados((v) => !v)}
            className={cn(
              'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
              mostrarArquivados
                ? 'bg-gray-100 text-gray-700 border-gray-300'
                : 'border-[#E7E8D1] text-gray-400 hover:text-gray-600'
            )}
          >
            {mostrarArquivados ? 'Ocultar arquivados' : 'Ver arquivados'}
          </button>
          <Button onClick={abrirNovo} size="sm" className="gap-1 h-8 text-xs bg-[#2D5016] hover:bg-[#2D5016]/90">
            <Plus className="h-3.5 w-3.5" /> Novo campo
          </Button>
        </div>
      </div>

      {camposFiltrados.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">
          {campos.length === 0 ? 'Nenhum campo criado ainda' : 'Nenhum campo neste filtro'}
        </div>
      ) : (
        <div className="divide-y divide-[#E7E8D1]">
          {camposFiltrados.map((c) => {
            const cor = ESCALAO_COR[c.escalao]
            return (
              <div key={c.id} className={cn('flex items-center gap-3 px-4 py-3', c.arquivado && 'opacity-50')}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold"
                  style={{ backgroundColor: cor?.light ?? '#F8F8F4', color: cor?.bg ?? '#36454F' }}
                >
                  {escalaoEmoji[c.escalao] ?? c.escalao[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#36454F] truncate">{c.nome}</span>
                    {c.ano && <span className="text-xs text-gray-400">{c.ano}</span>}
                    {c.local && <span className="text-xs text-gray-400">📍 {c.local}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-xs" style={{ color: cor?.bg ?? '#36454F' }}>{c.escalao}</span>
                    {c.seccao && <span className="text-xs text-gray-400">{seccaoLabels[c.seccao] ?? c.seccao}</span>}
                    {!c.setup_completo && (
                      <Badge className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200 py-0 px-1.5">
                        Setup pendente
                      </Badge>
                    )}
                    {c.arquivado && (
                      <Badge className="text-[10px] bg-gray-100 text-gray-500 border-gray-200 py-0 px-1.5">
                        Arquivado
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/campo/${c.id}`}
                    className="p-1.5 rounded-lg hover:bg-[#E7E8D1] text-gray-400 hover:text-[#36454F] transition-colors"
                    title="Abrir campo"
                    target="_blank"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => abrirEditar(c)}
                    className="p-1.5 rounded-lg hover:bg-[#E7E8D1] text-gray-400 hover:text-[#36454F] transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleArquivar(c)}
                    className="p-1.5 rounded-lg hover:bg-[#E7E8D1] text-gray-400 hover:text-[#36454F] transition-colors"
                    title={c.arquivado ? 'Restaurar' : 'Arquivar'}
                  >
                    {c.arquivado
                      ? <ArchiveRestore className="h-3.5 w-3.5" />
                      : <Archive className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar / editar campo */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar campo' : 'Novo campo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input autoFocus placeholder="Campo Mosquitos Lisboa 2025" value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Escalão *</Label>
                <Select value={form.escalao} onValueChange={(v) => setForm((f) => ({ ...f, escalao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {escalaoOptions.map((e) => (
                      <SelectItem key={e} value={e}>
                        {escalaoEmoji[e]} {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ano</Label>
                <Input type="number" placeholder="2025" value={form.ano}
                  onChange={(e) => setForm((f) => ({ ...f, ano: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Local</Label>
                <Input placeholder="Lisboa" value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>PIN *</Label>
                <Input placeholder="1234" value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Diretor</Label>
                <Input placeholder="Nome" value={form.diretor}
                  onChange={(e) => setForm((f) => ({ ...f, diretor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Adjunto</Label>
                <Input placeholder="Nome" value={form.adjunto}
                  onChange={(e) => setForm((f) => ({ ...f, adjunto: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Mamã</Label>
                <Input placeholder="Nome" value={form.mama}
                  onChange={(e) => setForm((f) => ({ ...f, mama: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Saldo inicial (€)</Label>
                <Input type="number" step="0.01" value={form.saldo_inicial}
                  onChange={(e) => setForm((f) => ({ ...f, saldo_inicial: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Datas (texto)</Label>
                <Input placeholder="14-21 Jul 2025" value={form.datas}
                  onChange={(e) => setForm((f) => ({ ...f, datas: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Pré-campo (texto)</Label>
              <Input placeholder="11-13 Jul 2025" value={form.pre_campo}
                onChange={(e) => setForm((f) => ({ ...f, pre_campo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button
              onClick={guardar}
              disabled={saving || !form.nome.trim() || !form.pin.trim()}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90"
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
