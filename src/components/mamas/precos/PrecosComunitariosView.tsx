'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, X, Search, ChevronDown, Edit2, Store, Euro, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Supermercado {
  id: string
  nome: string
  cadeia: string
  localidade: string | null
}

interface Preco {
  id: string
  produto: string
  categoria: string
  preco: number
  unidade: string
  supermercado_id: string | null
  criado_por: string
  data_registo: string
  notas: string | null
  supermercado?: Supermercado | null
}

interface Props {
  precosIniciais: Preco[]
  supermercadosIniciais: Supermercado[]
}

const CATEGORIAS = [
  { value: 'mercearia', label: 'Mercearia' },
  { value: 'talho', label: 'Talho' },
  { value: 'padaria', label: 'Padaria' },
  { value: 'frutas_legumes', label: 'Frutas/Legumes' },
  { value: 'lacticinios', label: 'Lacticínios' },
  { value: 'enlatados', label: 'Enlatados' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'temperos', label: 'Temperos' },
  { value: 'congelados', label: 'Congelados' },
  { value: 'outro', label: 'Outro' },
]

const CADEIAS = ['Continente', 'Pingo Doce', 'Lidl', 'Auchan', 'Intermarché', 'Minipreço', 'Outro']

const UNIDADES = ['kg', 'g', 'L', 'mL', 'un', 'pacote', 'lata', 'dúzia', 'embalagem', 'rolo', 'saco']

function formatData(data: string) {
  const d = new Date(data)
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

function normalizar(s: string) {
  return s.toLowerCase().trim()
}

type SheetMode = 'add' | 'edit' | 'novo_super' | null

export function PrecosComunitariosView({ precosIniciais, supermercadosIniciais }: Props) {
  const [precos, setPrecos] = useState<Preco[]>(precosIniciais)
  const [supermercados, setSupermercados] = useState<Supermercado[]>(supermercadosIniciais)
  const [pesquisa, setPesquisa] = useState('')
  const [filtroSuper, setFiltroSuper] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroCriador, setFiltroCriador] = useState('')
  const [sheet, setSheet] = useState<SheetMode>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [produtoSugestoes, setProdutoSugestoes] = useState<string[]>([])
  const [showSugestoes, setShowSugestoes] = useState(false)

  const [form, setForm] = useState({
    produto: '',
    categoria: 'mercearia',
    preco: '',
    unidade: 'kg',
    supermercado_id: '',
    criado_por: '',
    notas: '',
  })

  const [novoSuperForm, setNovoSuperForm] = useState({
    nome: '',
    cadeia: 'Continente',
    localidade: '',
  })

  const supabase = createClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load criado_por from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('precos_nome') ?? ''
    setForm((f) => ({ ...f, criado_por: saved }))
  }, [])

  function upd(key: string, v: string) {
    setForm((f) => {
      const next = { ...f, [key]: v }
      // Auto-fill category/unit from existing product
      if (key === 'produto' && v.trim()) {
        const match = precos.find((p) => normalizar(p.produto) === normalizar(v))
        if (match) {
          next.categoria = match.categoria
          next.unidade = match.unidade
        }
      }
      return next
    })
    if (key === 'produto') {
      const q = v.toLowerCase().trim()
      if (q.length > 1) {
        const nomes = [...new Set(precos.map((p) => p.produto).filter((n) => n.toLowerCase().includes(q)))]
        setProdutoSugestoes(nomes.slice(0, 6))
        setShowSugestoes(true)
      } else {
        setShowSugestoes(false)
      }
    }
  }

  // Debounced search → refetch from Supabase
  const handlePesquisa = useCallback((v: string) => {
    setPesquisa(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const query = supabase
        .from('precos')
        .select('*, supermercado:supermercados(*)')
        .order('produto')
      if (v.trim()) query.ilike('produto', `%${v.trim()}%`)
      const { data } = await query
      if (data) setPrecos(data as Preco[])
    }, 300)
  }, [supabase])

  // Group precos by normalised product name
  const grupos = useMemo(() => {
    let filtered = precos
    if (filtroSuper) filtered = filtered.filter((p) => p.supermercado_id === filtroSuper)
    if (filtroCategoria) filtered = filtered.filter((p) => p.categoria === filtroCategoria)
    if (filtroCriador) filtered = filtered.filter((p) => p.criado_por === filtroCriador)

    const map = new Map<string, Preco[]>()
    filtered.forEach((p) => {
      const key = normalizar(p.produto)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    // Sort by product name
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [precos, filtroSuper, filtroCategoria, filtroCriador])

  const criadores = useMemo(() => {
    return [...new Set(precos.map((p) => p.criado_por).filter(Boolean))].sort()
  }, [precos])

  function abrirAdicionar(produtoPreenchido?: string) {
    setEditId(null)
    setForm({
      produto: produtoPreenchido ?? '',
      categoria: 'mercearia',
      preco: '',
      unidade: 'kg',
      supermercado_id: supermercados[0]?.id ?? '',
      criado_por: localStorage.getItem('precos_nome') ?? '',
      notas: '',
    })
    setSheet('add')
  }

  function abrirEditar(p: Preco) {
    setEditId(p.id)
    setForm({
      produto: p.produto,
      categoria: p.categoria,
      preco: String(p.preco),
      unidade: p.unidade,
      supermercado_id: p.supermercado_id ?? '',
      criado_por: p.criado_por,
      notas: p.notas ?? '',
    })
    setSheet('edit')
  }

  async function guardar() {
    if (!form.produto.trim() || !form.preco || !form.supermercado_id) {
      toast.error('Produto, preço e supermercado são obrigatórios')
      return
    }
    setSaving(true)
    localStorage.setItem('precos_nome', form.criado_por)
    try {
      if (sheet === 'edit' && editId) {
        const { data, error } = await supabase
          .from('precos')
          .update({
            preco: parseFloat(form.preco),
            notas: form.notas.trim() || null,
            data_registo: new Date().toISOString().slice(0, 10),
          })
          .eq('id', editId)
          .select('*, supermercado:supermercados(*)')
          .single()
        if (error) throw error
        setPrecos((prev) => prev.map((p) => (p.id === editId ? (data as Preco) : p)))
        toast.success('Preço atualizado')
      } else {
        const { data, error } = await supabase
          .from('precos')
          .insert({
            produto: form.produto.trim(),
            categoria: form.categoria,
            preco: parseFloat(form.preco),
            unidade: form.unidade,
            supermercado_id: form.supermercado_id || null,
            criado_por: form.criado_por.trim() || 'Anónimo',
            notas: form.notas.trim() || null,
          })
          .select('*, supermercado:supermercados(*)')
          .single()
        if (error) throw error
        setPrecos((prev) => [...prev, data as Preco])
        toast.success('Preço adicionado')
      }
      setSheet(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function remover(id: string) {
    await supabase.from('precos').delete().eq('id', id)
    setPrecos((prev) => prev.filter((p) => p.id !== id))
    toast.success('Removido')
  }

  async function criarSupermercado() {
    if (!novoSuperForm.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('supermercados')
        .insert({
          nome: novoSuperForm.nome.trim(),
          cadeia: novoSuperForm.cadeia,
          localidade: novoSuperForm.localidade.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      const novo = data as Supermercado
      setSupermercados((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm((f) => ({ ...f, supermercado_id: novo.id }))
      setNovoSuperForm({ nome: '', cadeia: 'Continente', localidade: '' })
      setSheet('add')
      toast.success('Supermercado criado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const superMap = useMemo(() => {
    const m = new Map<string, Supermercado>()
    supermercados.forEach((s) => m.set(s.id, s))
    return m
  }, [supermercados])

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Search */}
      <div className="sticky top-0 z-10 bg-[#f8f8f4] px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={pesquisa}
            onChange={(e) => handlePesquisa(e.target.value)}
            placeholder="Pesquisar produto..."
            className="w-full pl-9 pr-4 py-2.5 border border-[#E7E8D1] rounded-xl text-sm text-[#36454F] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <select
            value={filtroSuper}
            onChange={(e) => setFiltroSuper(e.target.value)}
            className="shrink-0 border border-[#E7E8D1] rounded-lg px-2.5 py-1.5 text-xs text-[#36454F] bg-white focus:outline-none appearance-none pr-6 relative"
          >
            <option value="">Todos os supermercados</option>
            {supermercados.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="shrink-0 border border-[#E7E8D1] rounded-lg px-2.5 py-1.5 text-xs text-[#36454F] bg-white focus:outline-none appearance-none"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {criadores.length > 0 && (
            <select
              value={filtroCriador}
              onChange={(e) => setFiltroCriador(e.target.value)}
              className="shrink-0 border border-[#E7E8D1] rounded-lg px-2.5 py-1.5 text-xs text-[#36454F] bg-white focus:outline-none appearance-none"
            >
              <option value="">Toda a gente</option>
              {criadores.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Price list */}
      <div className="px-4 space-y-3 mt-2">
        {grupos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">💰</div>
            <p className="text-gray-500 font-semibold">Sem preços registados ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Sê o primeiro a adicionar!</p>
          </div>
        ) : (
          grupos.map(([key, items]) => (
            <div key={key} className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E7E8D1] bg-[#f8f8f4]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#36454F] text-sm">{items[0].produto}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {CATEGORIAS.find((c) => c.value === items[0].categoria)?.label ?? items[0].categoria}
                      {' · '}{items[0].unidade}
                    </p>
                  </div>
                  <button
                    onClick={() => abrirAdicionar(items[0].produto)}
                    className="shrink-0 flex items-center gap-1 text-xs text-[#2D5016] font-semibold hover:opacity-70 transition-opacity px-2 py-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Outro supermercado</span>
                  </button>
                </div>
              </div>
              <div className="divide-y divide-[#E7E8D1]">
                {items.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#2D5016] text-base">
                          {p.preco.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <span className="text-xs text-gray-400">/ {p.unidade}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {p.supermercado ? p.supermercado.nome : 'Supermercado desconhecido'}
                        {' · '}{p.criado_por}
                        {' · '}{formatData(p.data_registo)}
                      </p>
                      {p.notas && <p className="text-xs text-gray-400 italic truncate">{p.notas}</p>}
                    </div>
                    <button
                      onClick={() => abrirEditar(p)}
                      className="p-1.5 text-gray-300 hover:text-[#2D5016] transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remover(p.id)}
                      className="p-1.5 text-gray-300 hover:text-[#F96167] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-4 z-20">
        <button
          onClick={() => abrirAdicionar()}
          className="flex items-center gap-2 bg-[#2D5016] text-white rounded-full px-5 py-3 shadow-lg font-semibold text-sm hover:bg-[#2D5016]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar preço
        </button>
      </div>

      {/* Add / Edit sheet */}
      {(sheet === 'add' || sheet === 'edit') && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1] shrink-0">
              <span className="font-bold text-[#36454F] text-sm">
                {sheet === 'edit' ? 'Editar preço' : '+ Adicionar preço'}
              </span>
              <button onClick={() => setSheet(null)} className="p-1.5 rounded-lg hover:bg-[#E7E8D1] transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              {/* Produto */}
              {sheet === 'add' && (
                <div className="relative">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Produto *</label>
                  <input
                    autoFocus
                    value={form.produto}
                    onChange={(e) => upd('produto', e.target.value)}
                    onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
                    placeholder="Ex: Arroz Caçarola 1kg, Leite Mimosa 1L..."
                    className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
                  />
                  {showSugestoes && produtoSugestoes.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-[#E7E8D1] rounded-xl shadow-lg z-10 mt-1 overflow-hidden">
                      {produtoSugestoes.map((s) => (
                        <button
                          key={s}
                          onMouseDown={() => { upd('produto', s); setShowSugestoes(false) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#36454F] hover:bg-[#f8f8f4] border-b border-[#E7E8D1] last:border-0"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sheet === 'edit' && (
                <div className="bg-[#f8f8f4] rounded-xl px-4 py-2.5">
                  <p className="text-xs text-gray-500">Produto</p>
                  <p className="font-semibold text-[#36454F] text-sm">{form.produto}</p>
                </div>
              )}

              {/* Preço + Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Preço (€) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.preco}
                    onChange={(e) => upd('preco', e.target.value)}
                    placeholder="1.23"
                    className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Unidade</label>
                  <select
                    value={form.unidade}
                    onChange={(e) => upd('unidade', e.target.value)}
                    disabled={sheet === 'edit'}
                    className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white disabled:opacity-60"
                  >
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Categoria */}
              {sheet === 'add' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => upd('categoria', e.target.value)}
                    className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white"
                  >
                    {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}

              {/* Supermercado */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Supermercado *</label>
                <div className="flex gap-2">
                  <select
                    value={form.supermercado_id}
                    onChange={(e) => upd('supermercado_id', e.target.value)}
                    disabled={sheet === 'edit'}
                    className="flex-1 border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white disabled:opacity-60"
                  >
                    <option value="">Selecionar...</option>
                    {supermercados.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                  {sheet === 'add' && (
                    <button
                      onClick={() => setSheet('novo_super')}
                      className="shrink-0 flex items-center gap-1 border border-[#E7E8D1] rounded-xl px-3 py-2 text-xs text-[#36454F] hover:bg-[#E7E8D1] transition-colors"
                    >
                      <Store className="h-3.5 w-3.5" />
                      Novo
                    </button>
                  )}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">O teu nome</label>
                <input
                  value={form.criado_por}
                  onChange={(e) => upd('criado_por', e.target.value)}
                  placeholder="Mamã Mema, Tia Tecas..."
                  disabled={sheet === 'edit'}
                  className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] disabled:opacity-60"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Notas</label>
                <input
                  value={form.notas}
                  onChange={(e) => upd('notas', e.target.value)}
                  placeholder="Promoção, marca branca, pack de 6..."
                  className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
                />
              </div>

              <Button
                onClick={guardar}
                disabled={saving || !form.produto.trim() || !form.preco || !form.supermercado_id}
                className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90 min-h-[48px]"
              >
                {saving ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Novo supermercado sheet */}
      {sheet === 'novo_super' && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSheet('add')} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1]">
              <span className="font-bold text-[#36454F] text-sm">Novo supermercado</span>
              <button onClick={() => setSheet('add')} className="p-1.5 rounded-lg hover:bg-[#E7E8D1] transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Nome *</label>
                <input
                  autoFocus
                  value={novoSuperForm.nome}
                  onChange={(e) => setNovoSuperForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Pingo Doce Castelo Branco"
                  className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Cadeia</label>
                <select
                  value={novoSuperForm.cadeia}
                  onChange={(e) => setNovoSuperForm((f) => ({ ...f, cadeia: e.target.value }))}
                  className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white"
                >
                  {CADEIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Localidade</label>
                <input
                  value={novoSuperForm.localidade}
                  onChange={(e) => setNovoSuperForm((f) => ({ ...f, localidade: e.target.value }))}
                  placeholder="Ex: Castelo Branco"
                  className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
                />
              </div>
              <Button
                onClick={criarSupermercado}
                disabled={saving || !novoSuperForm.nome.trim()}
                className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90 min-h-[48px]"
              >
                {saving ? 'A criar...' : 'Criar supermercado'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
