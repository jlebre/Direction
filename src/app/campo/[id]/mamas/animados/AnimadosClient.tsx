'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Upload, User, AlertTriangle, Pill, Phone, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Animado } from '@/types/mamas'
import { SECCAO_LABELS } from '@/types/shared'
import * as XLSX from 'xlsx'

interface AnimadoComContagens extends Omit<Animado, 'restricoes' | 'medicacoes' | 'contactos'> {
  restricoes?: { id: string; tipo: string }[]
  medicacoes?: { id: string }[]
  contactos?: { id: string }[]
}

const SECCOES = Object.entries(SECCAO_LABELS)

export default function AnimadosClient({
  campoId,
  campoSeccao,
  animadosIniciais,
}: {
  campoId: string
  campoSeccao: string | null
  animadosIniciais: AnimadoComContagens[]
}) {
  const router = useRouter()
  const [animados, setAnimados] = useState<AnimadoComContagens[]>(animadosIniciais)
  const [modalAdd, setModalAdd] = useState(false)
  const [modalExcel, setModalExcel] = useState(false)
  const [form, setForm] = useState({ nome: '', data_nascimento: '', seccao: campoSeccao ?? '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [excelRows, setExcelRows] = useState<{ nome: string; data_nascimento: string; seccao: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  function handleExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
        const parsed = rows
          .map((row) => ({
            nome: String(row['Nome'] ?? row['nome'] ?? row['NOME'] ?? '').trim(),
            data_nascimento: String(row['Data Nascimento'] ?? row['data_nascimento'] ?? row['DataNascimento'] ?? '').trim(),
            seccao: String(row['Secção'] ?? row['Seccao'] ?? row['seccao'] ?? row['SECCAO'] ?? '').trim(),
          }))
          .filter((r) => r.nome.length > 0)
        setExcelRows(parsed)
      } catch {
        toast.error('Erro ao ler o ficheiro Excel')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function importarExcel() {
    if (excelRows.length === 0) return
    setUploading(true)
    try {
      const inserts = excelRows.map((r) => ({
        campo_id: campoId,
        nome: r.nome,
        data_nascimento: r.data_nascimento || null,
        seccao: r.seccao || campoSeccao || null,
        notas: null,
      }))
      const { data, error } = await supabase.from('animados').insert(inserts).select('id, nome, seccao, data_nascimento, notas, created_at')
      if (error) throw error
      setAnimados((prev) => [...prev, ...(data as AnimadoComContagens[])])
      setModalExcel(false)
      setExcelRows([])
      toast.success(`${data.length} animados importados!`)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar')
    } finally {
      setUploading(false)
    }
  }

  async function adicionarManual() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('animados')
        .insert({
          campo_id: campoId,
          nome: form.nome.trim(),
          data_nascimento: form.data_nascimento || null,
          seccao: form.seccao || null,
          notas: form.notas.trim() || null,
        })
        .select('id, nome, seccao, data_nascimento, notas, created_at')
        .single()
      if (error) throw error
      setAnimados((prev) => [...prev, data as AnimadoComContagens])
      setForm({ nome: '', data_nascimento: '', seccao: campoSeccao ?? '', notas: '' })
      setModalAdd(false)
      toast.success('Animado adicionado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => setModalExcel(true)}
          variant="outline"
          size="sm"
          className="gap-1.5 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016]/10"
        >
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
        <Button
          onClick={() => setModalAdd(true)}
          size="sm"
          className="gap-1.5 bg-[#2D5016] hover:bg-[#2D5016]/90 ml-auto"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {animados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 space-y-2">
          <User className="h-12 w-12 mx-auto" />
          <p className="font-medium">Sem animados registados</p>
          <p className="text-xs">Importa uma lista Excel ou adiciona um a um</p>
        </div>
      ) : (
        <div className="space-y-2">
          {animados.map((a) => (
            <Link key={a.id} href={`/campo/${campoId}/mamas/animados/${a.id}`}>
              <div className="bg-white rounded-xl border border-[#E7E8D1] px-4 py-3 flex items-center gap-3 active:bg-gray-50">
                <div className="w-9 h-9 rounded-full bg-[#2D5016]/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-[#2D5016]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#36454F] truncate">{a.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {a.seccao && (
                      <span className="text-xs text-gray-400">{SECCAO_LABELS[a.seccao as keyof typeof SECCAO_LABELS] ?? a.seccao}</span>
                    )}
                    {a.data_nascimento && (
                      <span className="text-xs text-gray-400">
                        · {new Date(a.data_nascimento + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {(a.restricoes?.length ?? 0) > 0 && (
                    <Badge className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      {a.restricoes!.length}
                    </Badge>
                  )}
                  {(a.medicacoes?.length ?? 0) > 0 && (
                    <Badge className="text-[10px] bg-purple-100 text-purple-800 border-purple-300">
                      <Pill className="h-2.5 w-2.5 mr-0.5" />
                      {a.medicacoes!.length}
                    </Badge>
                  )}
                  {(a.contactos?.length ?? 0) > 0 && (
                    <Badge className="text-[10px] bg-blue-100 text-blue-800 border-blue-300">
                      <Phone className="h-2.5 w-2.5 mr-0.5" />
                      {a.contactos!.length}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-300 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal adicionar manualmente */}
      <Dialog open={modalAdd} onOpenChange={setModalAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar animado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                placeholder="Maria Silva"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={form.data_nascimento}
                onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Secção</Label>
              <Select value={form.seccao} onValueChange={(v) => setForm((f) => ({ ...f, seccao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {SECCOES.map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Observações..."
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAdd(false)}>Cancelar</Button>
            <Button onClick={adicionarManual} disabled={saving || !form.nome.trim()} className="bg-[#2D5016] hover:bg-[#2D5016]/90">
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal importar Excel */}
      <Dialog open={modalExcel} onOpenChange={setModalExcel}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importar lista Excel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-xl p-4 text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-[#2D5016]">Formato esperado:</p>
              <p>Colunas: <code className="bg-white px-1 rounded text-xs">Nome</code> · <code className="bg-white px-1 rounded text-xs">Data Nascimento</code> · <code className="bg-white px-1 rounded text-xs">Secção</code></p>
              <p className="text-xs text-gray-400">Apenas a coluna Nome é obrigatória</p>
            </div>
            <div className="space-y-1">
              <Label>Ficheiro (.xlsx ou .xls)</Label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFile}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#2D5016]/10 file:text-[#2D5016] hover:file:bg-[#2D5016]/20 cursor-pointer"
              />
            </div>
            {excelRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#36454F]">{excelRows.length} animados encontrados:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-[#E7E8D1] p-2">
                  {excelRows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50">
                      <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="flex-1 font-medium text-[#36454F]">{r.nome}</span>
                      {r.seccao && <span className="text-xs text-gray-400">{r.seccao}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalExcel(false); setExcelRows([]) }}>Cancelar</Button>
            <Button
              onClick={importarExcel}
              disabled={uploading || excelRows.length === 0}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90"
            >
              {uploading ? 'A importar...' : `Importar ${excelRows.length > 0 ? `(${excelRows.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
