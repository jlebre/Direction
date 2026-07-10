'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, X, AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IngredientesTable } from '@/components/mamas/receitas/IngredientesTable'
import { CATEGORIA_LABELS, CATEGORIA_CORES } from '@/types/mamas'
import type { Receita, ReceitaIngrediente, CategoriaReceita } from '@/types/mamas'
import type { Campo, SeccaoTipo } from '@/types/shared'
import { cn } from '@/lib/utils'
import { calcularBandas, arredondarPratico } from '@/lib/mamas/fatores-escalao'
import type { TipoProduto, EscalaoFator } from '@/lib/mamas/fatores-escalao'

type AlertaPreco = { nome: string; tipo: 'sem_referencia' | 'preco_incompleto' }

interface Props {
  receita: Receita & { ingredientes: ReceitaIngrediente[] }
  campo: Campo
  precosReferencia?: { produto: string; preco: number | null }[]
}

const UNIDADES = ['g', 'kg', 'ml', 'L', 'un', 'dl', 'colher', 'chávena', 'lata', 'pacote', 'fatia', 'dente']

const TIPO_PRODUTO_OPTS: { value: TipoProduto; label: string }[] = [
  { value: 'outro', label: 'Outro / geral' },
  { value: 'massa', label: 'Massa / esparguete' },
  { value: 'arroz', label: 'Arroz' },
  { value: 'carne', label: 'Carne / aves' },
  { value: 'atum', label: 'Atum / peixe enlatado' },
  { value: 'pao', label: 'Pão' },
  { value: 'sopa', label: 'Base de sopa / caldo' },
  { value: 'bolachas', label: 'Bolachas / biscoitos' },
]

const ESCALAO_CALC_OPTS: { value: EscalaoFator; label: string }[] = [
  { value: 'mosquitos', label: 'Mosquitos' },
  { value: 'aranhicos', label: 'Aranhiços' },
  { value: 'melgas', label: 'Melgas' },
  { value: 'tremelgas', label: 'Tremelgas' },
  { value: 'camaleoes', label: 'Camaleões' },
  { value: 'animadores', label: 'Animadores' },
]

const DICAS_SOPA = `- Usar a água de cozer a massa para fazer a sopa.
- Dissolver os pacotes de sopa em menos água primeiro e aos pouquinhos, para evitar grumos.
- Dá para fazer a sopa na sorna; aguenta a temperatura até ao jantar.`

type IngResultado = { id: string; nome: string; unidade_base: string; tipo_produto: string }

export function ReceitaDetail({ receita, campo, precosReferencia }: Props) {
  const [modo, setModo] = useState<'ver' | 'editar'>('ver')
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [forking, setForking] = useState(false)
  const [verificada, setVerificada] = useState(receita.quantidades_verificadas ?? false)
  const [markingVerif, setMarkingVerif] = useState(false)
  const [showVerifConfirm, setShowVerifConfirm] = useState(false)
  const [form, setForm] = useState({
    nome: receita.nome,
    categoria: receita.categoria,
    descricao: receita.descricao ?? '',
    instrucoes: receita.instrucoes ?? '',
    dicas_campo: receita.dicas_campo ?? '',
    tags: receita.tags?.join(', ') ?? '',
  })
  const [ingredientes, setIngredientes] = useState<ReceitaIngrediente[]>(receita.ingredientes ?? [])

  // ── Adicionar ingrediente ──────────────────────────────────────────────────
  const [novoIng, setNovoIng] = useState({
    unidade: 'g', notas: '',
    qtd_mosquitos: '', qtd_aranh_melgas: '', qtd_cam_trem: '',
  })
  const [novoIngTipo, setNovoIngTipo] = useState<TipoProduto>('outro')
  const [refEscalao, setRefEscalao] = useState<EscalaoFator>('melgas')
  const [refQtd, setRefQtd] = useState('')
  const [autoCalcado, setAutoCalcado] = useState(false)
  const [addingIng, setAddingIng] = useState(false)
  const [ingPesquisa, setIngPesquisa] = useState('')
  const [ingResultados, setIngResultados] = useState<IngResultado[]>([])
  const [ingSelecionado, setIngSelecionado] = useState<{ id: string; nome: string } | null>(null)
  const [ingDropdownOpen, setIngDropdownOpen] = useState(false)
  const [ingBuscando, setIngBuscando] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Editar ingrediente inline ──────────────────────────────────────────────
  const [editIngId, setEditIngId] = useState<string | null>(null)
  const [editIngForm, setEditIngForm] = useState({
    ingPesquisa: '',
    ingSelecionado: null as { id: string; nome: string } | null,
    qtd_mosquitos: '', qtd_aranh_melgas: '', qtd_cam_trem: '',
    unidade: 'g', notas: '',
    tipoProduto: 'outro' as TipoProduto,
    refEscalao: 'melgas' as EscalaoFator,
    refQtd: '',
    autoCalcado: false,
  })
  const [editIngResultados, setEditIngResultados] = useState<IngResultado[]>([])
  const [editIngDropdown, setEditIngDropdown] = useState(false)
  const [editIngBuscando, setEditIngBuscando] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const editSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const supabase = createClient()
  const campoId = campo.id
  const corCat = CATEGORIA_CORES[form.categoria]

  const alertasPreco = useMemo<AlertaPreco[]>(() => {
    if (!precosReferencia || ingredientes.length === 0) return []
    const result: AlertaPreco[] = []
    for (const ing of ingredientes) {
      const nome = ing.ingrediente?.nome
      if (!nome) continue
      const matches = precosReferencia.filter(
        (p) => p.produto.toLowerCase().trim() === nome.toLowerCase().trim()
      )
      if (matches.length === 0) {
        result.push({ nome, tipo: 'sem_referencia' })
      } else if (matches.some((p) => p.preco == null)) {
        result.push({ nome, tipo: 'preco_incompleto' })
      }
    }
    return result
  }, [precosReferencia, ingredientes])

  function handleMarcarVerificada() {
    if (alertasPreco.length > 0) {
      setShowVerifConfirm(true)
    } else {
      marcarVerificada(true)
    }
  }

  function handleCategoria(v: CategoriaReceita) {
    setForm((f) => ({
      ...f,
      categoria: v,
      dicas_campo: v === 'sopa' && !f.dicas_campo.trim() ? DICAS_SOPA : f.dicas_campo,
    }))
  }

  async function marcarVerificada(v: boolean) {
    setMarkingVerif(true)
    try {
      const { error } = await supabase
        .from('receitas')
        .update({ quantidades_verificadas: v })
        .eq('id', receita.id)
      if (error) throw error
      setVerificada(v)
      toast.success(v ? 'Receita marcada como verificada!' : 'Marcada como por verificar')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setMarkingVerif(false)
    }
  }

  async function guardar() {
    setSaving(true)
    try {
      const { error } = await supabase.from('receitas').update({
        nome: form.nome.trim(),
        categoria: form.categoria,
        descricao: form.descricao.trim() || null,
        instrucoes: form.instrucoes.trim() || null,
        dicas_campo: form.dicas_campo.trim() || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }).eq('id', receita.id)
      if (error) throw error
      toast.success('Receita guardada!')
      setModo('ver')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('receitas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', receita.id)
      if (error) throw error
      toast.success('Receita apagada')
      router.push(`/campo/${campoId}/receitas`)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao apagar')
      setDeleting(false)
    }
  }

  function handleCalcular() {
    const qty = parseFloat(refQtd)
    if (!qty || qty <= 0) { toast.error('Introduz uma quantidade válida'); return }
    const { mosquitos, aranh_melgas, cam_trem, fallback } = calcularBandas(qty, refEscalao, novoIngTipo)
    const u = novoIng.unidade
    setNovoIng((n) => ({
      ...n,
      qtd_mosquitos: String(arredondarPratico(mosquitos, u)),
      qtd_aranh_melgas: String(arredondarPratico(aranh_melgas, u)),
      qtd_cam_trem: String(arredondarPratico(cam_trem, u)),
    }))
    setAutoCalcado(true)
    if (fallback) toast.info('Sem fator específico para este tipo. Foi usado 1.00.')
  }

  function handleCalcularEdit() {
    const qty = parseFloat(editIngForm.refQtd)
    if (!qty || qty <= 0) { toast.error('Introduz uma quantidade válida'); return }
    const { mosquitos, aranh_melgas, cam_trem, fallback } = calcularBandas(qty, editIngForm.refEscalao, editIngForm.tipoProduto)
    const u = editIngForm.unidade
    setEditIngForm((f) => ({
      ...f,
      qtd_mosquitos: String(arredondarPratico(mosquitos, u)),
      qtd_aranh_melgas: String(arredondarPratico(aranh_melgas, u)),
      qtd_cam_trem: String(arredondarPratico(cam_trem, u)),
      autoCalcado: true,
    }))
    if (fallback) toast.info('Sem fator específico para este tipo. Foi usado 1.00.')
  }

  function pesquisarIngredientes(q: string) {
    setIngPesquisa(q)
    setIngSelecionado(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setIngResultados([]); setIngDropdownOpen(false); return }
    setIngBuscando(true)
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('ingredientes')
        .select('id, nome, unidade_base, tipo_produto')
        .ilike('nome', `%${q}%`)
        .order('nome')
        .limit(8)
      setIngResultados(data ?? [])
      setIngDropdownOpen(true)
      setIngBuscando(false)
    }, 200)
  }

  function pesquisarEditIng(q: string) {
    setEditIngForm((f) => ({ ...f, ingPesquisa: q, ingSelecionado: null, autoCalcado: false }))
    if (editSearchTimeout.current) clearTimeout(editSearchTimeout.current)
    if (q.length < 2) { setEditIngResultados([]); setEditIngDropdown(false); return }
    setEditIngBuscando(true)
    editSearchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('ingredientes')
        .select('id, nome, unidade_base, tipo_produto')
        .ilike('nome', `%${q}%`)
        .order('nome')
        .limit(8)
      setEditIngResultados(data ?? [])
      setEditIngDropdown(true)
      setEditIngBuscando(false)
    }, 200)
  }

  function selecionarIngrediente(ing: IngResultado) {
    setIngSelecionado({ id: ing.id, nome: ing.nome })
    setIngPesquisa(ing.nome)
    setNovoIngTipo((ing.tipo_produto as TipoProduto) || 'outro')
    setNovoIng((n) => ({ ...n, unidade: ing.unidade_base }))
    setIngResultados([])
    setIngDropdownOpen(false)
  }

  function selecionarEditIng(ing: IngResultado) {
    setEditIngForm((f) => ({
      ...f,
      ingPesquisa: ing.nome,
      ingSelecionado: { id: ing.id, nome: ing.nome },
      tipoProduto: (ing.tipo_produto as TipoProduto) || 'outro',
      unidade: ing.unidade_base,
      autoCalcado: false,
    }))
    setEditIngResultados([])
    setEditIngDropdown(false)
  }

  function limparSeleccaoIng() {
    setIngSelecionado(null)
    setIngPesquisa('')
    setIngResultados([])
    setIngDropdownOpen(false)
  }

  function iniciarEditIng(ing: ReceitaIngrediente) {
    setEditIngId(ing.id)
    setEditIngForm({
      ingPesquisa: ing.ingrediente?.nome ?? '',
      ingSelecionado: ing.ingrediente ? { id: ing.ingrediente_id, nome: ing.ingrediente.nome } : null,
      qtd_mosquitos: ing.quantidade_mosquitos != null ? String(ing.quantidade_mosquitos) : '',
      qtd_aranh_melgas: ing.quantidade_aranh_melgas != null ? String(ing.quantidade_aranh_melgas) : '',
      qtd_cam_trem: ing.quantidade_cam_trem != null ? String(ing.quantidade_cam_trem) : '',
      unidade: ing.unidade,
      notas: ing.notas ?? '',
      tipoProduto: 'outro',
      refEscalao: 'melgas',
      refQtd: '',
      autoCalcado: false,
    })
    setEditIngResultados([])
    setEditIngDropdown(false)
  }

  function cancelarEditIng() {
    setEditIngId(null)
    setEditIngResultados([])
    setEditIngDropdown(false)
  }

  async function removerIngrediente(id: string) {
    const { error } = await supabase.from('receita_ingredientes').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setIngredientes((prev) => prev.filter((i) => i.id !== id))
  }

  async function guardarEditIng() {
    if (!editIngId) return
    setSavingEdit(true)
    try {
      let ingredienteId: string | undefined
      if (editIngForm.ingSelecionado) {
        ingredienteId = editIngForm.ingSelecionado.id
      } else if (editIngForm.ingPesquisa.trim()) {
        const { data } = await supabase
          .from('ingredientes').select('id')
          .ilike('nome', editIngForm.ingPesquisa.trim())
          .maybeSingle()
        if (data) ingredienteId = data.id
      }

      const { data: updated, error } = await supabase
        .from('receita_ingredientes')
        .update({
          ...(ingredienteId ? { ingrediente_id: ingredienteId } : {}),
          quantidade_mosquitos: parseFloat(editIngForm.qtd_mosquitos) || null,
          quantidade_aranh_melgas: parseFloat(editIngForm.qtd_aranh_melgas) || null,
          quantidade_cam_trem: parseFloat(editIngForm.qtd_cam_trem) || null,
          unidade: editIngForm.unidade,
          notas: editIngForm.notas.trim() || null,
        })
        .eq('id', editIngId)
        .select('*, ingrediente:ingredientes(*)')
        .single()

      if (error) throw error
      setIngredientes((prev) => prev.map((i) => i.id === editIngId ? updated as ReceitaIngrediente : i))
      setEditIngId(null)
      toast.success('Ingrediente atualizado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar ingrediente')
    } finally {
      setSavingEdit(false)
    }
  }

  async function adicionarIngrediente() {
    const nome = ingSelecionado?.nome || ingPesquisa.trim()
    if (!nome) return
    setAddingIng(true)
    try {
      let ingredienteId: string
      let isNovo = false
      if (ingSelecionado) {
        ingredienteId = ingSelecionado.id
      } else {
        const { data: existing } = await supabase
          .from('ingredientes').select('id').ilike('nome', nome).maybeSingle()
        if (existing) {
          ingredienteId = existing.id
        } else {
          const { data: novo, error } = await supabase.from('ingredientes').insert({
            nome,
            categoria_supermercado: 'outro',
            unidade_base: novoIng.unidade,
            tipo_armazenamento: 'despensa',
            tipo_produto: novoIngTipo,
          }).select('id').single()
          if (error || !novo) throw error
          ingredienteId = novo.id
          isNovo = true
        }
      }

      // Fase 3: ingrediente novo → criar entrada em preços (sem preço, por completar)
      if (isNovo) {
        await supabase.from('precos').insert({
          produto: nome,
          categoria: 'outro',
          preco: null,
          unidade: novoIng.unidade,
          criado_por: 'Receitas',
          ingrediente_id: ingredienteId,
        })
      }

      const { data: criado, error: errI } = await supabase
        .from('receita_ingredientes')
        .insert({
          receita_id: receita.id,
          ingrediente_id: ingredienteId,
          quantidade_mosquitos: parseFloat(novoIng.qtd_mosquitos) || null,
          quantidade_aranh_melgas: parseFloat(novoIng.qtd_aranh_melgas) || null,
          quantidade_cam_trem: parseFloat(novoIng.qtd_cam_trem) || null,
          unidade: novoIng.unidade,
          notas: novoIng.notas.trim() || null,
        })
        .select('*, ingrediente:ingredientes(*)')
        .single()
      if (errI || !criado) throw errI
      setIngredientes((prev) => [...prev, criado as ReceitaIngrediente])
      setIngPesquisa('')
      setIngSelecionado(null)
      setIngResultados([])
      setIngDropdownOpen(false)
      setNovoIng({ unidade: 'g', notas: '', qtd_mosquitos: '', qtd_aranh_melgas: '', qtd_cam_trem: '' })
      setNovoIngTipo('outro')
      setRefQtd('')
      setAutoCalcado(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar ingrediente')
    } finally {
      setAddingIng(false)
    }
  }

  async function criarNovaVersao() {
    setForking(true)
    try {
      const { data: novaReceita, error: errR } = await supabase
        .from('receitas')
        .insert({
          nome: `${receita.nome} (versão campo)`,
          categoria: receita.categoria,
          descricao: receita.descricao ?? null,
          instrucoes: receita.instrucoes ?? null,
          dicas_campo: receita.dicas_campo ?? null,
          tags: receita.tags ?? [],
          pessoas_base: receita.pessoas_base,
          is_oficial: false,
        })
        .select('id')
        .single()
      if (errR || !novaReceita) throw errR
      if (ingredientes.length > 0) {
        const { error: errI } = await supabase.from('receita_ingredientes').insert(
          ingredientes.map((i) => ({
            receita_id: novaReceita.id,
            ingrediente_id: i.ingrediente_id,
            quantidade_mosquitos: i.quantidade_mosquitos,
            quantidade_aranh_melgas: i.quantidade_aranh_melgas,
            quantidade_cam_trem: i.quantidade_cam_trem,
            unidade: i.unidade,
            notas: i.notas,
          }))
        )
        if (errI) throw errI
      }
      toast.success('Versão criada!')
      router.push(`/campo/${campoId}/receitas/${novaReceita.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar versão')
    } finally {
      setForking(false)
    }
  }

  const totalPessoas = (campo.num_animados ?? 0) + (campo.num_animadores ?? 0)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-10">

      {/* ── Banner: por verificar ── */}
      {modo === 'ver' && !verificada && !showVerifConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">
              {receita.instrucoes?.trim() ? 'Quantidades por verificar' : 'Receita incompleta'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {receita.instrucoes?.trim()
                ? 'Revê os ingredientes e quantidades, corrige se necessário e marca como verificada.'
                : 'Esta receita ainda não tem preparação — podes marcá-la como verificada na mesma.'}
            </p>
          </div>
          <button
            onClick={handleMarcarVerificada}
            disabled={markingVerif}
            className="text-xs font-semibold text-amber-800 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 shrink-0 hover:bg-amber-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {markingVerif ? '...' : '✓ Verificada'}
          </button>
        </div>
      )}

      {/* ── Confirmação: marcar verificada com alertas ── */}
      {modo === 'ver' && !verificada && showVerifConfirm && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-900">Ingredientes/preços por completar</p>
              <ul className="mt-1.5 space-y-0.5">
                {alertasPreco.map((a) => (
                  <li key={a.nome} className="text-xs text-amber-800">
                    <span className="font-medium">{a.nome}</span>
                    {' — '}
                    {a.tipo === 'sem_referencia' ? 'não está na tabela de preços' : 'preço por completar'}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-2">O orçamento pode ficar incompleto. Queres marcar como verificada na mesma?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowVerifConfirm(false); marcarVerificada(true) }}
              disabled={markingVerif}
              className="text-xs font-semibold text-amber-900 bg-white border border-amber-400 rounded-lg px-3 py-1.5 hover:bg-amber-50 disabled:opacity-50 transition-colors"
            >
              {markingVerif ? 'A marcar...' : '✓ Marcar como verificada'}
            </button>
            <button
              onClick={() => setShowVerifConfirm(false)}
              className="text-xs text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Badge: verificada ── */}
      {modo === 'ver' && verificada && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700">Verificada</span>
            <button
              onClick={() => marcarVerificada(false)}
              disabled={markingVerif}
              className="ml-1 text-[10px] text-gray-400 hover:text-gray-600 underline disabled:opacity-50"
            >
              reverter
            </button>
          </div>
          {alertasPreco.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Preços incompletos
              </p>
              {alertasPreco.map((a) => (
                <p key={a.nome} className="text-xs text-amber-700 pl-5">
                  <span className="font-medium">{a.nome}</span>
                  {' — '}
                  {a.tipo === 'sem_referencia' ? 'não está na tabela de preços' : 'preço por completar'}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Alertas de preço (receita não verificada) ── */}
      {modo === 'ver' && !verificada && alertasPreco.length > 0 && !showVerifConfirm && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {alertasPreco.length} ingrediente{alertasPreco.length !== 1 ? 's' : ''} sem preço de referência
          </p>
          {alertasPreco.map((a) => (
            <p key={a.nome} className="text-xs text-amber-700 pl-5">
              <span className="font-medium">{a.nome}</span>
              {' — '}
              {a.tipo === 'sem_referencia' ? 'não está na tabela de preços' : 'preço por completar'}
            </p>
          ))}
        </div>
      )}

      {/* ── Confirmação apagar ── */}
      {showDelete && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-sm">Tens a certeza que queres apagar esta receita?</p>
              <p className="text-red-700 text-xs mt-1">
                {receita.is_oficial
                  ? 'Esta receita pode estar a ser usada em planos de outros campos. Apagar afeta todos os planos que a referenciam.'
                  : 'Se esta receita estiver usada em planos antigos, esses planos podem ficar sem referência.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white text-xs">
              {deleting ? 'A apagar...' : 'Apagar receita'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDelete(false)} className="text-xs">Cancelar</Button>
          </div>
        </div>
      )}

      {/* ── Cabeçalho: badges + botões editar/apagar ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {modo === 'ver' && (
            <Badge className={cn('border', corCat)}>{CATEGORIA_LABELS[form.categoria]}</Badge>
          )}
          {modo === 'ver' && form.tags && form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">#{tag}</span>
          ))}
        </div>
        {modo === 'ver' && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={() => setModo('editar')}
              className="flex items-center gap-1.5 text-xs font-medium text-[#2D5016] bg-[#2D5016]/10 hover:bg-[#2D5016]/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#B85042] bg-[#B85042]/10 hover:bg-[#B85042]/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Apagar
            </button>
          </div>
        )}
      </div>

      {/* ── Vista ── */}
      {modo === 'ver' && (
        <>
          {receita.descricao && (
            <p className="text-gray-600 text-sm">{receita.descricao}</p>
          )}
          {ingredientes.length > 0 && (
            <div>
              <h2 className="font-bold text-[#36454F] mb-3">Ingredientes</h2>
              <IngredientesTable
                ingredientes={ingredientes.map((ri) => ({
                  id: ri.id,
                  quantidade_mosquitos: ri.quantidade_mosquitos ?? 0,
                  quantidade_aranh_melgas: ri.quantidade_aranh_melgas ?? 0,
                  quantidade_cam_trem: ri.quantidade_cam_trem ?? 0,
                  unidade: ri.unidade,
                  notas: ri.notas,
                  ingrediente: ri.ingrediente ? { nome: ri.ingrediente.nome } : undefined,
                }))}
                seccao={(campo.seccao ?? 'aranhicos') as SeccaoTipo}
                totalPessoas={totalPessoas}
                naoVerificada={!verificada}
              />
            </div>
          )}
          {receita.instrucoes && (
            <div>
              <h2 className="font-bold text-[#36454F] mb-2">Preparação</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{receita.instrucoes}</p>
            </div>
          )}
          {receita.dicas_campo && (
            <div className="bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-xl p-4">
              <p className="font-semibold text-[#2D5016] text-sm mb-1">Dica para o campo</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{receita.dicas_campo}</p>
            </div>
          )}
        </>
      )}

      {/* ── Modo editar ── */}
      {modo === 'editar' && (
        <div className="space-y-4">
          {receita.is_oficial && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-1.5">
              <p className="text-xs text-sky-700">
                Esta é uma receita base. As alterações ficam guardadas diretamente nesta receita.
              </p>
              <button
                type="button"
                onClick={criarNovaVersao}
                disabled={forking}
                className="text-xs font-medium text-sky-700 underline hover:text-sky-900 disabled:opacity-50"
              >
                {forking ? 'A criar...' : 'Preferir criar uma versão separada para este campo'}
              </button>
            </div>
          )}

          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => handleCategoria(v as CategoriaReceita)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORIA_LABELS) as [CategoriaReceita, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Preparação</Label>
            <Textarea rows={5} value={form.instrucoes} onChange={(e) => setForm((f) => ({ ...f, instrucoes: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Dica para o campo</Label>
            <Textarea rows={3} value={form.dicas_campo} onChange={(e) => setForm((f) => ({ ...f, dicas_campo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="vegetariano, rápido" />
          </div>

          {/* ── Ingredientes ── */}
          <div className="space-y-2">
            <Label>Ingredientes</Label>
            {ingredientes.length > 0 && (
              <div className="border border-[#E7E8D1] rounded-xl overflow-hidden divide-y divide-[#E7E8D1]">
                {ingredientes.map((ing) =>
                  editIngId === ing.id ? (
                    /* ── Inline edit form ── */
                    <div key={ing.id} className="p-3 bg-[#f8f9f4] space-y-2">
                      {/* Ingredient search */}
                      {!editIngForm.ingSelecionado ? (
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            <Input
                              placeholder="Pesquisar ingrediente..."
                              value={editIngForm.ingPesquisa}
                              onChange={(e) => pesquisarEditIng(e.target.value)}
                              onBlur={() => setTimeout(() => setEditIngDropdown(false), 150)}
                              onFocus={() => editIngResultados.length > 0 && setEditIngDropdown(true)}
                              className="text-sm pl-8"
                            />
                          </div>
                          {editIngBuscando && <p className="text-[10px] text-gray-400 mt-1 pl-1">A pesquisar...</p>}
                          {editIngDropdown && (
                            <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                              {editIngResultados.map((r) => (
                                <button key={r.id} type="button"
                                  onMouseDown={(e) => { e.preventDefault(); selecionarEditIng(r) }}
                                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                                  <span className="text-sm font-medium text-gray-800">{r.nome}</span>
                                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">{r.unidade_base}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#2D5016] shrink-0" />
                            <span className="text-sm font-medium text-[#2D5016] truncate">{editIngForm.ingSelecionado.nome}</span>
                          </div>
                          <button type="button"
                            onClick={() => setEditIngForm((f) => ({ ...f, ingSelecionado: null, ingPesquisa: '' }))}
                            className="text-xs text-gray-400 hover:text-gray-600 shrink-0 ml-2">
                            × trocar
                          </button>
                        </div>
                      )}

                      {/* Tipo produto */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 shrink-0">Tipo:</span>
                        <Select value={editIngForm.tipoProduto}
                          onValueChange={(v) => setEditIngForm((f) => ({ ...f, tipoProduto: v as TipoProduto, autoCalcado: false }))}>
                          <SelectTrigger className="text-xs h-7 flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPO_PRODUTO_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Calcular escalão */}
                      <div className="bg-white rounded-lg p-2 space-y-1.5 border border-[#E7E8D1]">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recalcular por escalão</p>
                        <div className="flex items-center gap-1.5">
                          <Input placeholder="Qtd" type="number" min="0.01" step="0.01"
                            value={editIngForm.refQtd}
                            onChange={(e) => setEditIngForm((f) => ({ ...f, refQtd: e.target.value }))}
                            className="text-xs h-7 w-16 shrink-0" />
                          <span className="text-[10px] text-gray-400 shrink-0">{editIngForm.unidade}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">para</span>
                          <Select value={editIngForm.refEscalao}
                            onValueChange={(v) => setEditIngForm((f) => ({ ...f, refEscalao: v as EscalaoFator }))}>
                            <SelectTrigger className="text-xs h-7 flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ESCALAO_CALC_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <button type="button" onClick={handleCalcularEdit}
                            className="text-[10px] font-semibold text-[#2D5016] bg-[#2D5016]/15 hover:bg-[#2D5016]/25 rounded px-2 h-7 shrink-0 transition-colors">
                            Calcular
                          </button>
                        </div>
                      </div>

                      {editIngForm.autoCalcado && (
                        <p className="text-[10px] text-[#2D5016]">✓ Calculado automaticamente · edita à vontade</p>
                      )}

                      {/* 3 bandas + unidade */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <Input placeholder="Mosquitos" type="number"
                          value={editIngForm.qtd_mosquitos}
                          onChange={(e) => setEditIngForm((f) => ({ ...f, qtd_mosquitos: e.target.value, autoCalcado: false }))}
                          className="text-xs" />
                        <Input placeholder="Aranh/Mel" type="number"
                          value={editIngForm.qtd_aranh_melgas}
                          onChange={(e) => setEditIngForm((f) => ({ ...f, qtd_aranh_melgas: e.target.value, autoCalcado: false }))}
                          className="text-xs" />
                        <Input placeholder="Cam/Trem" type="number"
                          value={editIngForm.qtd_cam_trem}
                          onChange={(e) => setEditIngForm((f) => ({ ...f, qtd_cam_trem: e.target.value, autoCalcado: false }))}
                          className="text-xs" />
                        <Select value={editIngForm.unidade}
                          onValueChange={(v) => setEditIngForm((f) => ({ ...f, unidade: v }))}>
                          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input placeholder="Notas (opcional)" value={editIngForm.notas}
                        onChange={(e) => setEditIngForm((f) => ({ ...f, notas: e.target.value }))}
                        className="text-sm" />

                      <div className="flex gap-2 pt-1">
                        <button onClick={guardarEditIng} disabled={savingEdit}
                          className="text-xs font-medium text-white bg-[#2D5016] hover:bg-[#2D5016]/90 disabled:opacity-40 rounded-lg px-3 py-1.5 transition-colors">
                          {savingEdit ? 'A guardar...' : 'Guardar'}
                        </button>
                        <button onClick={cancelarEditIng}
                          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <div key={ing.id} className="flex items-center gap-2 px-3 py-2 bg-white">
                      <span className="flex-1 text-sm text-[#36454F]">{ing.ingrediente?.nome ?? '—'}</span>
                      <span className="text-xs text-gray-400">
                        {[
                          ing.quantidade_mosquitos && `${ing.quantidade_mosquitos}${ing.unidade}`,
                          ing.quantidade_aranh_melgas && `${ing.quantidade_aranh_melgas}${ing.unidade}`,
                          ing.quantidade_cam_trem && `${ing.quantidade_cam_trem}${ing.unidade}`,
                        ].filter(Boolean).join(' / ') || ing.unidade}
                      </span>
                      <button
                        onClick={() => iniciarEditIng(ing)}
                        className="text-gray-300 hover:text-[#2D5016] transition-colors p-1"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removerIngrediente(ing.id)}
                        className="text-gray-300 hover:text-[#B85042] transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Formulário adicionar ingrediente */}
            <div className="border border-dashed border-[#E7E8D1] rounded-xl p-3 space-y-2 bg-[#f8f9f4]">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />Adicionar ingrediente
              </p>

              {!ingSelecionado ? (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input
                      placeholder="Pesquisar ingrediente..."
                      value={ingPesquisa}
                      onChange={(e) => pesquisarIngredientes(e.target.value)}
                      onBlur={() => setTimeout(() => setIngDropdownOpen(false), 150)}
                      onFocus={() => ingResultados.length > 0 && setIngDropdownOpen(true)}
                      className="text-sm pl-8"
                    />
                  </div>
                  {ingBuscando && <p className="text-[10px] text-gray-400 mt-1 pl-1">A pesquisar...</p>}
                  {ingDropdownOpen && (
                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                      {ingResultados.map((ing) => (
                        <button key={ing.id} type="button"
                          onMouseDown={(e) => { e.preventDefault(); selecionarIngrediente(ing) }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                          <span className="text-sm font-medium text-gray-800">{ing.nome}</span>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                            {ing.unidade_base} · {ing.tipo_produto}
                          </span>
                        </button>
                      ))}
                      {ingResultados.length === 0 && ingPesquisa.length >= 2 && !ingBuscando && (
                        <div className="px-3 py-2.5">
                          <p className="text-xs text-gray-500">Nenhum resultado.</p>
                          <p className="text-xs text-[#2D5016] font-medium mt-0.5">
                            Clica &quot;+ Adicionar&quot; para criar &quot;{ingPesquisa}&quot;.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#2D5016] shrink-0" />
                    <span className="text-sm font-medium text-[#2D5016] truncate">{ingSelecionado.nome}</span>
                  </div>
                  <button type="button" onClick={limparSeleccaoIng}
                    className="text-xs text-gray-400 hover:text-gray-600 shrink-0 ml-2">
                    × trocar
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 shrink-0">Tipo produto:</span>
                <Select value={novoIngTipo}
                  onValueChange={(v) => { setNovoIngTipo(v as TipoProduto); setAutoCalcado(false) }}>
                  <SelectTrigger className="text-xs h-7 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_PRODUTO_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-white rounded-lg p-2 space-y-1.5 border border-[#E7E8D1]">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Calcular por escalão</p>
                <div className="flex items-center gap-1.5">
                  <Input placeholder="Qtd" type="number" min="0.01" step="0.01"
                    value={refQtd}
                    onChange={(e) => setRefQtd(e.target.value)}
                    className="text-xs h-7 w-16 shrink-0" />
                  <span className="text-[10px] text-gray-400 shrink-0">{novoIng.unidade}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">para</span>
                  <Select value={refEscalao} onValueChange={(v) => setRefEscalao(v as EscalaoFator)}>
                    <SelectTrigger className="text-xs h-7 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESCALAO_CALC_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button type="button" onClick={handleCalcular}
                    className="text-[10px] font-semibold text-[#2D5016] bg-[#2D5016]/15 hover:bg-[#2D5016]/25 rounded px-2 h-7 shrink-0 transition-colors">
                    Calcular
                  </button>
                </div>
              </div>

              {autoCalcado && <p className="text-[10px] text-[#2D5016]">✓ Calculado automaticamente · edita à vontade</p>}

              <div className="grid grid-cols-4 gap-1.5">
                <Input placeholder="Mosquitos" type="number" value={novoIng.qtd_mosquitos}
                  onChange={(e) => { setNovoIng((n) => ({ ...n, qtd_mosquitos: e.target.value })); setAutoCalcado(false) }}
                  className="text-xs" />
                <Input placeholder="Aranh/Mel" type="number" value={novoIng.qtd_aranh_melgas}
                  onChange={(e) => { setNovoIng((n) => ({ ...n, qtd_aranh_melgas: e.target.value })); setAutoCalcado(false) }}
                  className="text-xs" />
                <Input placeholder="Cam/Trem" type="number" value={novoIng.qtd_cam_trem}
                  onChange={(e) => { setNovoIng((n) => ({ ...n, qtd_cam_trem: e.target.value })); setAutoCalcado(false) }}
                  className="text-xs" />
                <Select value={novoIng.unidade} onValueChange={(v) => setNovoIng((n) => ({ ...n, unidade: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Notas (opcional)" value={novoIng.notas}
                onChange={(e) => setNovoIng((n) => ({ ...n, notas: e.target.value }))}
                className="text-sm" />
              <button
                onClick={adicionarIngrediente}
                disabled={(!ingSelecionado && !ingPesquisa.trim()) || addingIng}
                className="text-xs font-medium text-[#2D5016] bg-[#2D5016]/10 hover:bg-[#2D5016]/20 disabled:opacity-40 rounded-lg px-3 py-1.5 transition-colors"
              >
                {addingIng ? 'A adicionar...' : '+ Adicionar'}
              </button>
            </div>
          </div>

          {/* Guardar + Marcar verificada */}
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <Button onClick={guardar} disabled={saving || !form.nome.trim()}
                className="flex-1 bg-[#2D5016] hover:bg-[#2D5016]/90">
                {saving ? 'A guardar...' : 'Guardar alterações'}
              </Button>
              <button
                onClick={() => {
                  setModo('ver')
                  setEditIngId(null)
                  setForm({
                    nome: receita.nome,
                    categoria: receita.categoria,
                    descricao: receita.descricao ?? '',
                    instrucoes: receita.instrucoes ?? '',
                    dicas_campo: receita.dicas_campo ?? '',
                    tags: receita.tags?.join(', ') ?? '',
                  })
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!verificada && (
              <button
                onClick={handleMarcarVerificada}
                disabled={markingVerif}
                className="w-full text-xs font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg py-2 transition-colors disabled:opacity-50"
              >
                {markingVerif ? 'A marcar...' : '✓ Guardar e marcar como verificada'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
