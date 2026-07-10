'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type Receita,
  type CategoriaReceita,
  CATEGORIA_LABELS,
  CATEGORIA_CORES,
} from '@/types/mamas'
import { cn } from '@/lib/utils'

const CATEGORIAS: { value: CategoriaReceita | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'sopa', label: 'Sopas' },
  { value: 'carne', label: 'Carne' },
  { value: 'frango', label: 'Frango' },
  { value: 'bacalhau', label: 'Bacalhau' },
  { value: 'atum', label: 'Atum' },
  { value: 'massa', label: 'Massas' },
  { value: 'arroz_pure', label: 'Arroz' },
  { value: 'salada', label: 'Saladas' },
  { value: 'doce', label: 'Doces' },
  { value: 'pequeno_almoco', label: 'Pequeno-almoço' },
  { value: 'lanche', label: 'Lanche' },
]

const TAGS_RAPIDAS = ['vegetariano', 'sem lactose', 'sem glúten', 'rápido', 'económico']

type EstadoFiltro = 'all' | 'incompleta' | 'por_verificar' | 'verificadas'

interface ReceitasGridProps {
  receitas: Receita[]
  campo: { id: string; nome: string; seccao?: string; num_animados?: number; num_animadores?: number } | null
  campoId: string
  alertasPreco?: Record<string, number>
}

export function ReceitasGrid({ receitas, campo, campoId, alertasPreco }: ReceitasGridProps) {
  const [pesquisa, setPesquisa] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaReceita | 'all'>('all')
  const [tagFiltro, setTagFiltro] = useState<string | null>(null)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('all')

  // Definição de estado de cada receita
  function getEstado(r: Receita): 'incompleta' | 'por_verificar' | 'verificada' {
    if (r.quantidades_verificadas ?? false) return 'verificada'
    if (!r.instrucoes?.trim()) return 'incompleta'
    return 'por_verificar'
  }

  const receitasFiltradas = useMemo(() => {
    const q = pesquisa.toLowerCase()
    return receitas.filter((r) => {
      const matchPesquisa = !q || r.nome.toLowerCase().includes(q) || r.descricao?.toLowerCase().includes(q)
      const matchCat = categoriaFiltro === 'all' || r.categoria === categoriaFiltro
      const matchTag = !tagFiltro || r.tags?.includes(tagFiltro)
      const estado = getEstado(r)
      const matchEstado =
        estadoFiltro === 'all' ||
        (estadoFiltro === 'incompleta' && estado === 'incompleta') ||
        (estadoFiltro === 'por_verificar' && estado === 'por_verificar') ||
        (estadoFiltro === 'verificadas' && estado === 'verificada')
      return matchPesquisa && matchCat && matchTag && matchEstado
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitas, pesquisa, categoriaFiltro, tagFiltro, estadoFiltro])

  const incompletas = receitasFiltradas.filter((r) => getEstado(r) === 'incompleta')
  const porVerificar = receitasFiltradas.filter((r) => getEstado(r) === 'por_verificar')
  const verificadas = receitasFiltradas.filter((r) => getEstado(r) === 'verificada')

  // Contagens para os chips de estado
  const nIncompletas = receitas.filter((r) => getEstado(r) === 'incompleta').length
  const nPorVerif = receitas.filter((r) => getEstado(r) === 'por_verificar').length

  const ESTADOS: { value: EstadoFiltro; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'incompleta', label: `Incompletas${nIncompletas > 0 ? ` (${nIncompletas})` : ''}` },
    { value: 'por_verificar', label: `Por verificar${nPorVerif > 0 ? ` (${nPorVerif})` : ''}` },
    { value: 'verificadas', label: 'Verificadas' },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Pesquisar receita..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>
        <Link href={`/campo/${campoId}/receitas/nova`}>
          <Button size="default" className="gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova receita</span>
          </Button>
        </Link>
      </div>

      {/* Estado filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ESTADOS.map((op) => (
          <button
            key={op.value}
            onClick={() => setEstadoFiltro(op.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              estadoFiltro === op.value
                ? op.value === 'incompleta'
                  ? 'bg-gray-500 text-white border-gray-500'
                  : op.value === 'por_verificar'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : op.value === 'verificadas'
                      ? 'bg-[#2D5016] text-white border-[#2D5016]'
                      : 'bg-gray-700 text-white border-gray-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Categoria filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoriaFiltro(cat.value as CategoriaReceita | 'all')}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              categoriaFiltro === cat.value
                ? 'bg-[#B85042] text-white border-[#B85042]'
                : 'bg-white border-gray-200 text-gray-600 hover:border-[#B85042]/30'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tags filter */}
      <div className="flex gap-1.5 flex-wrap">
        {TAGS_RAPIDAS.map((tag) => (
          <button
            key={tag}
            onClick={() => setTagFiltro(tagFiltro === tag ? null : tag)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs border transition-colors',
              tagFiltro === tag
                ? 'bg-[#A7BEAE] text-[#36454F] border-[#A7BEAE]'
                : 'bg-white border-gray-200 text-gray-500 hover:border-[#A7BEAE]'
            )}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500">
        {receitasFiltradas.length} receita{receitasFiltradas.length !== 1 ? 's' : ''}
      </p>

      {/* ── Incompletas ── */}
      {incompletas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pencil className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-600">Incompletas</h2>
            <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
              {incompletas.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {incompletas.map((receita) => (
              <ReceitaCard key={receita.id} receita={receita} campoId={campoId} estado="incompleta" alertasPreco={alertasPreco?.[receita.id] ?? 0} />
            ))}
          </div>
        </div>
      )}

      {/* ── Por verificar ── */}
      {porVerificar.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-amber-700">Por verificar</h2>
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {porVerificar.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {porVerificar.map((receita) => (
              <ReceitaCard key={receita.id} receita={receita} campoId={campoId} estado="por_verificar" alertasPreco={alertasPreco?.[receita.id] ?? 0} />
            ))}
          </div>
        </div>
      )}

      {/* ── Verificadas ── */}
      {verificadas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-bold text-[#36454F]">Verificadas</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {verificadas.map((receita) => (
              <ReceitaCard key={receita.id} receita={receita} campoId={campoId} estado="verificada" alertasPreco={alertasPreco?.[receita.id] ?? 0} />
            ))}
          </div>
        </div>
      )}

      {receitasFiltradas.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>Nenhuma receita encontrada</p>
        </div>
      )}
    </div>
  )
}

function ReceitaCard({
  receita,
  campoId,
  estado,
  alertasPreco,
}: {
  receita: Receita
  campoId: string
  estado: 'incompleta' | 'por_verificar' | 'verificada'
  alertasPreco: number
}) {
  const corCat = CATEGORIA_CORES[receita.categoria]

  return (
    <Link href={`/campo/${campoId}/receitas/${receita.id}`}>
      <Card
        className={cn(
          'hover:shadow-md transition-shadow cursor-pointer group h-full',
          estado === 'incompleta' && 'border-gray-300 bg-gray-50/50',
          estado === 'por_verificar' && 'border-amber-200',
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm leading-tight group-hover:text-[#B85042] transition-colors">
              {receita.nome}
            </CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              {alertasPreco > 0 && (
                <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 font-medium whitespace-nowrap" title={`${alertasPreco} ingrediente${alertasPreco !== 1 ? 's' : ''} sem preço`}>
                  💰 {alertasPreco}
                </span>
              )}
              {estado === 'incompleta' && (
                <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">
                  Incompleta
                </span>
              )}
              {estado === 'por_verificar' && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">
                  Por verificar
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Badge className={cn('border text-xs', corCat)}>
            {CATEGORIA_LABELS[receita.categoria]}
          </Badge>
          {receita.tags && receita.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {receita.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {receita.descricao && (
            <p className="text-xs text-gray-500 line-clamp-2">{receita.descricao}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
