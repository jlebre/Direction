'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Local {
  id: string
  nome: string
  descricao: string | null
  morada: string | null
  ativo: boolean
  created_at: string
}

interface Props {
  locaisIniciais: Local[]
  camposPorLocal: Record<string, number>
}

interface FormLocal { nome: string; descricao: string; morada: string }
const FORM_VAZIO: FormLocal = { nome: '', descricao: '', morada: '' }

export function LocaisAdminClient({ locaisIniciais, camposPorLocal }: Props) {
  const [locais, setLocais] = useState<Local[]>(locaisIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormLocal>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState<Local | null>(null)
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const supabase = createClient()

  const ativos = locais.filter((l) => l.ativo)
  const arquivados = locais.filter((l) => !l.ativo)

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditId(null)
    setModalAberto(true)
  }

  function abrirEditar(l: Local) {
    setForm({ nome: l.nome, descricao: l.descricao ?? '', morada: l.morada ?? '' })
    setEditId(l.id)
    setModalAberto(true)
  }

  async function guardar() {
    if (!form.nome.trim()) return
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      morada: form.morada.trim() || null,
    }
    try {
      if (editId) {
        const { data, error } = await supabase.from('locais').update(payload).eq('id', editId).select('*').single()
        if (error) throw error
        setLocais((prev) => prev.map((l) => (l.id === editId ? (data as Local) : l)))
        toast.success('Local atualizado')
      } else {
        const { data, error } = await supabase.from('locais').insert({ ...payload, ativo: true }).select('*').single()
        if (error) throw error
        setLocais((prev) => [...prev, data as Local])
        toast.success('Local criado')
      }
      setModalAberto(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function arquivar(l: Local) {
    const novoEstado = !l.ativo
    const { error } = await supabase.from('locais').update({ ativo: novoEstado }).eq('id', l.id)
    if (error) { toast.error('Erro'); return }
    setLocais((prev) => prev.map((x) => (x.id === l.id ? { ...x, ativo: novoEstado } : x)))
    toast.success(novoEstado ? 'Local reativado' : 'Local arquivado')
  }

  async function apagarConfirmado() {
    if (!confirmarApagar) return
    const { error } = await supabase.from('locais').delete().eq('id', confirmarApagar.id)
    if (error) { toast.error('Erro ao apagar'); return }
    setLocais((prev) => prev.filter((l) => l.id !== confirmarApagar.id))
    toast.success('Local apagado')
    setConfirmarApagar(null)
  }

  function LocalCard({ l }: { l: Local }) {
    const nCampos = camposPorLocal[l.nome] ?? 0
    return (
      <div className={cn('bg-white rounded-xl border border-[#E7E8D1] p-4', !l.ativo && 'opacity-60')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[#36454F] truncate">{l.nome}</p>
            {l.descricao && <p className="text-xs text-gray-500 mt-0.5 truncate">{l.descricao}</p>}
            {l.morada && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {l.morada}</p>}
          </div>
          {nCampos > 0 && (
            <span className="text-xs bg-[#E7E8D1] text-[#36454F] rounded-full px-2 py-0.5 shrink-0">
              {nCampos} campo{nCampos !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pt-3 mt-2 border-t border-[#E7E8D1]">
          <button type="button" onClick={() => abrirEditar(l)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#B85042] transition-colors">
            <Pencil className="h-3 w-3" /> Editar
          </button>
          <span className="text-gray-200">·</span>
          <button type="button" onClick={() => arquivar(l)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#2D5016] transition-colors">
            {l.ativo ? <><Archive className="h-3 w-3" /> Arquivar</> : <><ArchiveRestore className="h-3 w-3" /> Reativar</>}
          </button>
          {nCampos === 0 && (
            <>
              <span className="text-gray-200">·</span>
              <button type="button" onClick={() => setConfirmarApagar(l)}
                className="flex items-center gap-1 text-xs text-[#F96167] hover:opacity-70 transition-opacity ml-auto">
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{ativos.length} local{ativos.length !== 1 ? 'is' : ''} ativo{ativos.length !== 1 ? 's' : ''}</p>
        <Button type="button" size="sm" onClick={abrirNovo} className="bg-[#2D5016] hover:bg-[#2D5016]/90 gap-1">
          <Plus className="h-4 w-4" /> Novo local
        </Button>
      </div>

      {ativos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📍</p>
          <p className="font-medium">Sem locais registados</p>
          <p className="text-sm">Cria o primeiro local com o botão acima</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ativos.map((l) => <LocalCard key={l.id} l={l} />)}
        </div>
      )}

      {arquivados.length > 0 && (
        <div className="space-y-3">
          <button type="button" onClick={() => setMostrarArquivados((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            {mostrarArquivados ? '▲' : '▼'} {arquivados.length} local{arquivados.length !== 1 ? 'is' : ''} arquivado{arquivados.length !== 1 ? 's' : ''}
          </button>
          {mostrarArquivados && arquivados.map((l) => <LocalCard key={l.id} l={l} />)}
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar local' : 'Novo local'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input placeholder="ex: Casa da Assunção" value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descrição <span className="text-xs text-gray-400">(opcional)</span></Label>
              <Input placeholder="Notas sobre o local" value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Morada <span className="text-xs text-gray-400">(opcional)</span></Label>
              <Textarea rows={2} placeholder="Rua, localidade..." value={form.morada}
                onChange={(e) => setForm((f) => ({ ...f, morada: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button type="button" onClick={guardar} disabled={saving || !form.nome.trim()}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar apagar */}
      <Dialog open={!!confirmarApagar} onOpenChange={(o) => { if (!o) setConfirmarApagar(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader><DialogTitle>Apagar local</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Apagar <strong>{confirmarApagar?.nome}</strong> permanentemente? Esta acção não pode ser desfeita.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarApagar(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={apagarConfirmado}>Apagar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
