'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Star, Plus } from 'lucide-react'
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

type EstadoFiltro = 'all' | 'por_verificar' | 'verificadas'

interface ReceitasGridProps {
  receitas: Receita[]
  campo: { id: string; nome: string; seccao: string; num_animados: number; num_animadores: number } | null
  campoId: string
}

export function ReceitasGrid({ receitas, campo, campoId }: ReceitasGridProps) {
  const [pesquisa, setPesquisa] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaReceita | 'all'>('all')
  const [tagFiltro, setTagFiltro] = useState<string | null>(null)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('all')

  const receitasFiltradas = useMemo(() => {
    const q = pesquisa.toLowerCase()
    return receitas.filter((r) => {
      const matchPesquisa = !q || r.nome.toLowerCase().includes(q) || r.descricao?.toLowerCase().includes(q)
      const matchCat = categoriaFiltro === 'all' || r.categoria === categoriaFiltro
      const matchTag = !tagFiltro || r.tags?.includes(tagFiltro)
      const verificada = r.quantidades_verificadas ?? false
      const matchEstado =
        estadoFiltro === 'all' ||
        (estadoFiltro === 'por_verificar' && !verificada) ||
        (estadoFiltro === 'verificadas' && verificada)
      return matchPesquisa && matchCat && matchTag && matchEstado
    })
  }, [receitas, pesquisa, categoriaFiltro, tagFiltro, estadoFiltro])

  const porVerificar = receitasFiltradas.filter((r) => !(r.quantidades_verificadas ?? false))
  const verificadasOficiais = receitasFiltradas.filter((r) => (r.quantidades_verificadas ?? false) && r.is_oficial)
  const verificadasCustom = receitasFiltradas.filter((r) => (r.quantidades_verificadas ?? false) && !r.is_oficial)

  const totalPorVerificar = receitas.filter((r) => !(r.quantidades_verificadas ?? false)).length

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
        <Link href={`/campo/${campoId}/mamas/receitas/nova`}>
          <Button size="default" className="gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova receita</span>
          </Button>
        </Link>
      </div>

      {/* Estado filter */}
      <div className="flex gap-1.5">
        {([
          { value: 'all', label: 'Todas' },
          { value: 'por_verificar', label: `Por verificar${totalPorVerificar > 0 ? ` (${totalPorVerificar})` : ''}` },
          { value: 'verificadas', label: 'Verificadas' },
        ] as { value: EstadoFiltro; label: string }[]).map((op) => (
          <button
            key={op.value}
            onClick={() => setEstadoFiltro(op.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              estadoFiltro === op.value
                ? op.value === 'por_verificar'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-[#2D5016] text-white border-[#2D5016]'
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

      {/* Por verificar — aparecem primeiro, com destaque */}
      {porVerificar.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500 text-sm">⚠</span>
            <h2 className="text-sm font-bold text-amber-700">Por verificar</h2>
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {porVerificar.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {porVerificar.map((receita) => (
              <ReceitaCard key={receita.id} receita={receita} campoId={campoId} porVerificar />
            ))}
          </div>
        </div>
      )}

      {/* Livrinho da Mamã — verificadas e oficiais */}
      {verificadasOficiais.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-[#B85042]" fill="currentColor" />
            <h2 className="text-sm font-bold text-[#36454F]">Livrinho da Mamã</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {verificadasOficiais.map((receita) => (
              <ReceitaCard key={receita.id} receita={receita} campoId={campoId} />
            ))}
          </div>
        </div>
      )}

      {/* Receitas personalizadas — verificadas e custom */}
      {verificadasCustom.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-[#36454F] mb-3">Receitas personalizadas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {verificadasCustom.map((receita) => (
              <ReceitaCard key={receita.id} receita={receita} campoId={campoId} />
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
  porVerificar,
}: {
  receita: Receita
  campoId: string
  porVerificar?: boolean
}) {
  const corCat = CATEGORIA_CORES[receita.categoria]

  return (
    <Link href={`/campo/${campoId}/mamas/receitas/${receita.id}`}>
      <Card
        className={cn(
          'hover:shadow-md transition-shadow cursor-pointer group h-full',
          porVerificar && 'border-amber-200 bg-amber-50/30'
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm leading-tight group-hover:text-[#B85042] transition-colors">
              {receita.nome}
            </CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              {receita.is_oficial && (
                <Star className="h-4 w-4 text-[#B85042]" fill="currentColor" />
              )}
              {porVerificar && (
                <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 font-medium">
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
