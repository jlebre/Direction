'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, AlertTriangle, User, Search, X } from 'lucide-react'
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
import type { RestricaoAlimentar, RestricaoTipo } from '@/types/mamas'
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

const GRAVIDADE_LABELS: Record<string, string> = {
  leve: 'Leve',
  media: 'Média',
  grave: 'Grave',
}

const GRAVIDADE_CORES: Record<string, string> = {
  leve: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  media: 'bg-orange-50 text-orange-700 border-orange-200',
  grave: 'bg-red-100 text-red-700 border-red-300',
}

interface RestricaoFormData {
  crianca_nome: string
  tipo: RestricaoTipo
  gravidade: 'leve' | 'media' | 'grave' | ''
  descricao: string
  ingredientes_proibidos: string
  notas: string
  ingredientesLinked: string[] // IDs de ingredientes do catálogo
}

const FORM_VAZIO: RestricaoFormData = {
  crianca_nome: '',
  tipo: 'alergia',
  gravidade: '',
  descricao: '',
  ingredientes_proibidos: '',
  notas: '',
  ingredientesLinked: [],
}

function getNomeCrianca(r: RestricaoAlimentar): string {
  return r.crianca_nome ?? r.animado?.nome ?? 'Criança'
}

export function RestricoesList({
  campoId,
  restricoesIniciais,
  ingredientes,
}: {
  campoId: string
  restricoesIniciais: RestricaoAlimentar[]
  ingredientes: { id: string; nome: string }[]
}) {
  const [restricoes, setRestricoes] = useState<RestricaoAlimentar[]>(restricoesIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<RestricaoFormData>(FORM_VAZIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<RestricaoTipo | 'todos'>('todos')
  const [confirmarApagar, setConfirmarApagar] = useState<{ id: string; nome: string } | null>(null)
  const [ingredienteSearch, setIngredienteSearch] = useState('')
  const supabase = createClient()

  const restricoesFiltradas = useMemo(() => {
    let lista = restricoes
    if (filtroTipo !== 'todos') lista = lista.filter((r) => r.tipo === filtroTipo)
    if (pesquisa.trim()) {
      const q = pesquisa.toLowerCase()
      lista = lista.filter(
        (r) =>
          getNomeCrianca(r).toLowerCase().includes(q) ||
          (r.descricao ?? '').toLowerCase().includes(q) ||
          (r.ingredientes_proibidos ?? []).some((i) => i.toLowerCase().includes(q)) ||
          (r.notas ?? '').toLowerCase().includes(q)
      )
    }
    return lista
  }, [restricoes, filtroTipo, pesquisa])

  const ingredientesFiltrados = useMemo(() => {
    const q = ingredienteSearch.trim().toLowerCase()
    if (!q) return []
    return ingredientes.filter((i) => i.nome.toLowerCase().includes(q)).slice(0, 30)
  }, [ingredientes, ingredienteSearch])

  function toggleIngrediente(id: string) {
    setForm((f) => ({
      ...f,
      ingredientesLinked: f.ingredientesLinked.includes(id)
        ? f.ingredientesLinked.filter((x) => x !== id)
        : [...f.ingredientesLinked, id],
    }))
  }

  function abrirNova() {
    setForm(FORM_VAZIO)
    setEditId(null)
    setIngredienteSearch('')
    setModalAberto(true)
  }

  function abrirEditar(r: RestricaoAlimentar) {
    setForm({
      crianca_nome: r.crianca_nome ?? r.animado?.nome ?? '',
      tipo: r.tipo,
      gravidade: r.gravidade ?? '',
      descricao: r.descricao ?? '',
      ingredientes_proibidos: (r.ingredientes_proibidos ?? []).join(', '),
      notas: r.notas ?? '',
      ingredientesLinked: (r.ingredientes_linked ?? []).map((l) => l.ingrediente_id),
    })
    setEditId(r.id)
    setIngredienteSearch('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setTimeout(() => { setForm(FORM_VAZIO); setEditId(null); setIngredienteSearch('') }, 200)
  }

  function buildLinkedData(ids: string[]) {
    return ids.map((lid) => {
      const ing = ingredientes.find((i) => i.id === lid)
      return { ingrediente_id: lid, ingrediente: ing ? { id: ing.id, nome: ing.nome } : undefined }
    })
  }

  async function guardar() {
    if (!form.crianca_nome.trim() || !form.descricao.trim()) return
    setSaving(true)
    const payload = {
      campo_id: campoId,
      crianca_nome: form.crianca_nome.trim(),
      tipo: form.tipo,
      gravidade: form.gravidade || null,
      descricao: form.descricao.trim(),
      ingredientes_proibidos: form.ingredientes_proibidos
        ? form.ingredientes_proibidos.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      notas: form.notas.trim() || null,
    }
    try {
      let restricaoId: string
      if (editId) {
        const { data: updated, error } = await supabase
          .from('restricoes_alimentares')
          .update(payload)
          .eq('id', editId)
          .select('*')
          .single()
        if (error) throw error
        restricaoId = editId
        const withLinks = { ...updated, ingredientes_linked: buildLinkedData(form.ingredientesLinked) } as RestricaoAlimentar
        setRestricoes((prev) => prev.map((r) => (r.id === editId ? withLinks : r)))
        toast.success('Guardado')
      } else {
        const { data: nova, error } = await supabase
          .from('restricoes_alimentares')
          .insert(payload)
          .select('*')
          .single()
        if (error) throw error
        restricaoId = (nova as { id: string }).id
        const withLinks = { ...nova, ingredientes_linked: buildLinkedData(form.ingredientesLinked) } as RestricaoAlimentar
        setRestricoes((prev) => [...prev, withLinks])
        toast.success('Restrição adicionada')
      }

      // Sync restricao_ingredientes
      const { error: delErr } = await supabase
        .from('restricao_ingredientes')
        .delete()
        .eq('restricao_id', restricaoId)
      if (delErr) throw delErr
      if (form.ingredientesLinked.length > 0) {
        const { error: insErr } = await supabase
          .from('restricao_ingredientes')
          .insert(form.ingredientesLinked.map((ingrediente_id) => ({ restricao_id: restricaoId, ingrediente_id })))
        if (insErr) throw insErr
      }

      fecharModal()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível guardar a restrição alimentar.')
    } finally {
      setSaving(false)
    }
  }

  async function removerConfirmado() {
    if (!confirmarApagar) return
    try {
      const { error } = await supabase
        .from('restricoes_alimentares')
        .delete()
        .eq('id', confirmarApagar.id)
      if (error) throw error
      setRestricoes((prev) => prev.filter((r) => r.id !== confirmarApagar.id))
      toast.success('Removido')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover')
    } finally {
      setConfirmarApagar(null)
    }
  }

  const contagem: Record<RestricaoTipo, number> = {
    alergia: 0, intolerancia: 0, dieta: 0, outro: 0,
  }
  restricoes.forEach((r) => { contagem[r.tipo]++ })

  return (
    <div className="p-4 space-y-4">
      {/* Resumo / filtros por tipo */}
      {restricoes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(contagem) as [RestricaoTipo, number][])
            .filter(([, n]) => n > 0)
            .map(([tipo, n]) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setFiltroTipo(filtroTipo === tipo ? 'todos' : tipo)}
                className={cn(
                  'rounded-lg border p-3 text-center transition-all',
                  TIPO_CORES[tipo],
                  filtroTipo === tipo ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'
                )}
              >
                <p className="text-2xl font-bold">{n}</p>
                <p className="text-xs font-semibold">{TIPO_LABELS[tipo]}{n !== 1 ? 's' : ''}</p>
              </button>
            ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar por nome ou descrição..."
            className="pl-8"
          />
        </div>
        <Button type="button" onClick={abrirNova} size="sm" className="gap-1 shrink-0">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {filtroTipo !== 'todos' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Filtro:</span>
          <button
            type="button"
            onClick={() => setFiltroTipo('todos')}
            className={cn('text-xs px-2 py-1 rounded-full border font-medium', TIPO_CORES[filtroTipo])}
          >
            {TIPO_LABELS[filtroTipo]} ×
          </button>
        </div>
      )}

      <p className="text-sm text-gray-500">
        {restricoesFiltradas.length === restricoes.length
          ? `${restricoes.length} restrição${restricoes.length !== 1 ? 'ões' : ''}`
          : `${restricoesFiltradas.length} de ${restricoes.length} restrições`}
      </p>

      {restricoesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 space-y-2">
          <AlertTriangle className="h-10 w-10 mx-auto" />
          <p>{restricoes.length === 0 ? 'Sem restrições alimentares registadas' : 'Nenhuma corresponde à pesquisa'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {restricoesFiltradas.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-[#E7E8D1] p-4 space-y-2">
              <div className="flex items-start gap-2 justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="font-bold text-[#36454F] truncate">{getNomeCrianca(r)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={cn('border text-xs', TIPO_CORES[r.tipo])}>
                    {TIPO_LABELS[r.tipo]}
                  </Badge>
                  {r.gravidade && (
                    <Badge className={cn('border text-xs', GRAVIDADE_CORES[r.gravidade])}>
                      {GRAVIDADE_LABELS[r.gravidade]}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirEditar(r)}
                    className="text-xs text-gray-400 hover:text-[#B85042] transition-colors min-h-[44px] px-1 flex items-center"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarApagar({ id: r.id, nome: getNomeCrianca(r) })}
                    className="text-[#F96167] hover:opacity-70 transition-opacity min-h-[44px] px-1 flex items-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Alert variant={r.tipo === 'alergia' ? 'destructive' : 'warning'} className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{r.descricao ?? '—'}</AlertDescription>
              </Alert>

              {r.ingredientes_proibidos && r.ingredientes_proibidos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-400">Texto:</span>
                  {r.ingredientes_proibidos.map((ing) => (
                    <span key={ing} className="text-xs bg-[#F96167]/10 text-[#F96167] rounded-full px-2 py-0.5 font-medium">
                      {ing}
                    </span>
                  ))}
                </div>
              )}

              {r.ingredientes_linked && r.ingredientes_linked.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-400">Catálogo:</span>
                  {r.ingredientes_linked.map((l) => (
                    <span key={l.ingrediente_id} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                      {l.ingrediente?.nome ?? l.ingrediente_id}
                    </span>
                  ))}
                </div>
              )}

              {r.notas && <p className="text-sm text-gray-500 italic">{r.notas}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal criação / edição — sem autoFocus para compatibilidade iOS Safari */}
      <Dialog open={modalAberto} onOpenChange={(open) => { if (!open) fecharModal() }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar restrição' : 'Nova restrição alimentar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <Label htmlFor="crianca_nome">Nome da criança *</Label>
              <Input
                id="crianca_nome"
                placeholder="Maria, João..."
                value={form.crianca_nome}
                onChange={(e) => setForm((f) => ({ ...f, crianca_nome: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
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
              <div className="space-y-1">
                <Label>Gravidade</Label>
                <Select
                  value={form.gravidade || 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, gravidade: v === 'none' ? '' : v as 'leve' | 'media' | 'grave' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não especificada</SelectItem>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição da restrição *</Label>
              <Input
                id="descricao"
                placeholder="Alergia a frutos secos, intolerância à lactose..."
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ingredientes">
                Ingredientes a evitar (texto livre){' '}
                <span className="text-gray-400 font-normal text-xs">separados por vírgula</span>
              </Label>
              <Input
                id="ingredientes"
                placeholder="amendoins, nozes, cajus"
                value={form.ingredientes_proibidos}
                onChange={(e) => setForm((f) => ({ ...f, ingredientes_proibidos: e.target.value }))}
              />
            </div>

            {/* Ingredientes do catálogo — verificação FK automática na ementa */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <Label>
                Ligar a ingredientes do catálogo{' '}
                <span className="text-gray-400 font-normal text-xs">verificação automática</span>
              </Label>

              {/* Linked chips */}
              {form.ingredientesLinked.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.ingredientesLinked.map((lid) => {
                    const ing = ingredientes.find((i) => i.id === lid)
                    return (
                      <button
                        key={lid}
                        type="button"
                        onClick={() => toggleIngrediente(lid)}
                        className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 font-medium"
                      >
                        {ing?.nome ?? lid}
                        <X className="h-3 w-3" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="Pesquisar no catálogo..."
                  value={ingredienteSearch}
                  onChange={(e) => setIngredienteSearch(e.target.value)}
                  className="pl-7 text-sm"
                />
              </div>

              {/* Results */}
              {ingredienteSearch.trim() && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {ingredientesFiltrados.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum ingrediente encontrado</p>
                  ) : (
                    ingredientesFiltrados.map((ing) => (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => toggleIngrediente(ing.id)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                          form.ingredientesLinked.includes(ing.id)
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                        )}
                      >
                        {form.ingredientesLinked.includes(ing.id) ? '✓ ' : ''}{ing.nome}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="notas">Notas adicionais</Label>
              <Textarea
                id="notas"
                rows={2}
                placeholder="Separar o molho no prato dele..."
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fecharModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={guardar}
              disabled={saving || !form.crianca_nome.trim() || !form.descricao.trim()}
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmação de apagar */}
      <Dialog open={!!confirmarApagar} onOpenChange={(open) => { if (!open) setConfirmarApagar(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover restrição</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Tens a certeza que queres remover a restrição de{' '}
            <strong>{confirmarApagar?.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarApagar(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={removerConfirmado}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
