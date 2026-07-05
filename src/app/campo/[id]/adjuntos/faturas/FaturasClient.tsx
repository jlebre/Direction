'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Campo } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import { CODE_CATEGORIES, getCodeColor } from '@/lib/adjuntos/codes'

interface Props {
  campo: Campo
  despesas: Despesa[]
}

type NifFilter = 'all' | 'com' | 'sem'
type FotoFilter = 'all' | 'com' | 'sem'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  })
}

export default function FaturasClient({ campo, despesas }: Props) {
  const [search, setSearch] = useState('')
  const [nifFilter, setNifFilter] = useState<NifFilter>('all')
  const [fotoFilter, setFotoFilter] = useState<FotoFilter>('all')
  const [codigoFilter, setCodigoFilter] = useState('')

  const filtered = useMemo(() => {
    return despesas.filter((d) => {
      if (nifFilter === 'com' && !d.nif_confirmado) return false
      if (nifFilter === 'sem' && d.nif_confirmado) return false
      if (fotoFilter === 'com' && !d.foto_path) return false
      if (fotoFilter === 'sem' && d.foto_path) return false
      if (codigoFilter && d.codigo !== codigoFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const descMatch = d.descricao?.toLowerCase().includes(q) ?? false
        const numMatch = String(d.numero_recibo).includes(q)
        if (!descMatch && !numMatch) return false
      }
      return true
    })
  }, [despesas, search, nifFilter, fotoFilter, codigoFilter])

  const totalFiltrado = filtered.reduce((s, d) => s + Number(d.valor), 0)
  const hasFilters = search.trim() || nifFilter !== 'all' || fotoFilter !== 'all' || codigoFilter

  function clearFilters() {
    setSearch('')
    setNifFilter('all')
    setFotoFilter('all')
    setCodigoFilter('')
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={`/campo/${campo.id}/adjuntos`} className="text-red-200 text-sm">
            ← Adjuntos
          </Link>
          <span className="text-red-200 text-sm">{campo.nome}</span>
        </div>
        <div className="max-w-lg mx-auto mt-2 flex items-end justify-between">
          <h1 className="text-xl font-bold">Consultar Faturas</h1>
          <span className="text-red-200 text-sm">{despesas.length} total</span>
        </div>
      </div>

      {/* Filtros fixos no topo */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-2.5">
          {/* Pesquisa */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Descrição ou nº de recibo..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#B85042] bg-gray-50"
            />
          </div>

          {/* Chips de filtro */}
          <div className="flex flex-wrap gap-1.5">
            {/* NIF */}
            {([
              { v: 'all', label: 'NIF: todos' },
              { v: 'com', label: '✓ Com NIF' },
              { v: 'sem', label: '⚠ Sem NIF' },
            ] as { v: NifFilter; label: string }[]).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setNifFilter(v)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  nifFilter === v
                    ? 'bg-[#B85042] text-white border-[#B85042]'
                    : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}

            {/* Foto */}
            {([
              { v: 'all', label: 'Foto: todas' },
              { v: 'com', label: '📷 Com foto' },
              { v: 'sem', label: '— Sem foto' },
            ] as { v: FotoFilter; label: string }[]).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setFotoFilter(v)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  fotoFilter === v
                    ? 'bg-[#B85042] text-white border-[#B85042]'
                    : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Categoria */}
          <select
            value={codigoFilter}
            onChange={(e) => setCodigoFilter(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-[#B85042] text-gray-700"
          >
            <option value="">Todas as categorias</option>
            {CODE_CATEGORIES.map((cat) => (
              <optgroup key={cat.label} label={`${cat.icon} ${cat.label}`}>
                {cat.codes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.short}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Resultados */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Resumo */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{filtered.length}</span>{' '}
            fatura{filtered.length !== 1 ? 's' : ''} ·{' '}
            <span className="font-semibold text-gray-800">€{totalFiltrado.toFixed(2)}</span>
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-[#B85042] font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm text-gray-400">Nenhuma fatura encontrada.</p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm text-[#B85042] font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((d) => (
              <FaturaRow key={d.id} despesa={d} campoId={campo.id} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// Row ligeiramente mais rica que DespesaItem: mostra NIF + foto + valor alinhado
function FaturaRow({ despesa: d, campoId }: { despesa: Despesa; campoId: string }) {
  const color = getCodeColor(d.codigo)

  return (
    <Link href={`/campo/${campoId}/adjuntos/despesa/${d.id}`}>
      <div className="flex items-start gap-3 py-3 px-4 bg-white rounded-xl border border-gray-100 active:bg-gray-50 transition-colors">
        {/* Nº */}
        <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
          <span className="text-xs font-bold text-gray-500">#{d.numero_recibo}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {d.descricao ?? <span className="text-gray-400 italic">Sem descrição</span>}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-xs text-gray-400">{formatDate(d.data)}</span>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color + '20', color }}
            >
              {d.codigo}
            </span>
            {d.foto_path ? (
              <span className="text-xs text-gray-400">📷</span>
            ) : (
              <span className="text-xs text-gray-300">sem foto</span>
            )}
            {!d.nif_confirmado && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                sem NIF
              </span>
            )}
          </div>
        </div>

        {/* Valor */}
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-gray-900">−€{Number(d.valor).toFixed(2)}</p>
          <Link
            href={`/campo/${campoId}/adjuntos/despesa/${d.id}/editar`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[#B85042] font-medium mt-0.5 block"
          >
            Editar
          </Link>
        </div>
      </div>
    </Link>
  )
}
