'use client'

import { useState, useMemo } from 'react'
import { Search, X, ChevronRight, AlertTriangle, Hospital, ArrowLeft } from 'lucide-react'
import {
  CATEGORIAS,
  pesquisar,
  itens112,
  itensPorCategoria,
  categoriaBySlug,
  type GuiaItem,
  type GuiaCategoria,
} from '@/lib/mamas/farmacia-guia'
import { cn } from '@/lib/utils'

type View = 'hub' | 'urgencias' | 'categoria' | 'item' | 'pesquisa'

function UrgenciaBadge({ urgencia }: { urgencia: GuiaItem['urgencia'] }) {
  if (urgencia === 'emergencia_112') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
      112
    </span>
  )
  if (urgencia === 'hospital') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded">
      Hospital
    </span>
  )
  return null
}

function ItemRow({ item, onClick }: { item: GuiaItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1] last:border-b-0',
        item.urgencia === 'emergencia_112' && 'border-l-4 border-l-red-500',
        item.urgencia === 'hospital' && 'border-l-4 border-l-orange-400',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-[#36454F]">{item.titulo}</span>
          <UrgenciaBadge urgencia={item.urgencia} />
        </div>
        {item.subtitulo && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitulo}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
    </button>
  )
}

function ItemDetalhe({ item, onBack }: { item: GuiaItem; onBack: () => void }) {
  const categoria = categoriaBySlug(item.categoriaSlug)
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#2D5016] font-medium">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div>
        <div className="flex items-start gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-[#36454F]">{item.titulo}</h2>
          <UrgenciaBadge urgencia={item.urgencia} />
        </div>
        {item.subtitulo && <p className="text-sm text-gray-500 mt-0.5">{item.subtitulo}</p>}
        {categoria && (
          <p className="text-xs text-gray-400 mt-1">{categoria.emoji} {categoria.nome}</p>
        )}
      </div>

      {item.descricao && (
        <p className="text-sm text-gray-700 leading-relaxed">{item.descricao}</p>
      )}

      {item.indicacoes && item.indicacoes.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Indicações</h3>
          <ul className="space-y-1">
            {item.indicacoes.map((ind, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-[#2D5016] font-bold shrink-0">·</span>
                {ind}
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.procedimento && item.procedimento.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Procedimento</h3>
          <ol className="space-y-2">
            {item.procedimento.map((passo, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="font-bold text-[#2D5016] shrink-0 w-5">{i + 1}.</span>
                {passo}
              </li>
            ))}
          </ol>
        </section>
      )}

      {item.notas && item.notas.length > 0 && (
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Notas</h3>
          <ul className="space-y-1">
            {item.notas.map((nota, i) => (
              <li key={i} className="text-sm text-blue-800 flex gap-2">
                <span className="shrink-0">·</span>
                {nota}
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.alertas && item.alertas.length > 0 && (
        <section className="bg-yellow-50 border border-yellow-300 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            <h3 className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Atenção</h3>
          </div>
          <ul className="space-y-1">
            {item.alertas.map((alerta, i) => (
              <li key={i} className="text-sm text-yellow-800 flex gap-2">
                <span className="shrink-0">·</span>
                {alerta}
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.quando_hospital && item.quando_hospital.length > 0 && (
        <section className="bg-orange-50 border border-orange-300 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Hospital className="h-4 w-4 text-orange-700" />
            <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wide">Levar ao Hospital / Centro de Saúde</h3>
          </div>
          <ul className="space-y-1">
            {item.quando_hospital.map((q, i) => (
              <li key={i} className="text-sm text-orange-800 flex gap-2">
                <span className="shrink-0">·</span>
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.quando_112 && item.quando_112.length > 0 && (
        <section className="bg-red-50 border border-red-400 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-black text-red-700">🆘 Chamar 112</span>
          </div>
          <ul className="space-y-1">
            {item.quando_112.map((q, i) => (
              <li key={i} className="text-sm text-red-800 flex gap-2 font-medium">
                <span className="shrink-0">·</span>
                {q}
              </li>
            ))}
          </ul>
          <a
            href="tel:112"
            className="mt-3 flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl py-3 font-bold text-base w-full active:opacity-80"
          >
            📞 Ligar 112
          </a>
        </section>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500 italic">
          Em caso de dúvida ou desconhecimento, não dar nada e contactar um responsável ou médico.
        </p>
      </div>
    </div>
  )
}

function UrgenciasView({ onSelectItem, onBack }: { onSelectItem: (item: GuiaItem) => void; onBack: () => void }) {
  const items = itens112()
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#2D5016] font-medium mb-4">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>
      <div className="bg-red-600 text-white rounded-xl p-4 mb-4">
        <p className="font-black text-lg">🆘 Urgências — Chamar 112</p>
        <p className="text-sm opacity-90 mt-1">Situações que requerem contacto imediato com o 112.</p>
        <a
          href="tel:112"
          className="mt-3 flex items-center justify-center gap-2 bg-white text-red-600 rounded-xl py-3 font-bold text-base w-full active:opacity-80"
        >
          📞 Ligar 112 agora
        </a>
      </div>
      <div className="bg-white border border-[#E7E8D1] rounded-xl overflow-hidden">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} onClick={() => onSelectItem(item)} />
        ))}
      </div>
    </div>
  )
}

function CategoriaView({
  categoria,
  onSelectItem,
  onBack,
}: {
  categoria: GuiaCategoria
  onSelectItem: (item: GuiaItem) => void
  onBack: () => void
}) {
  const items = itensPorCategoria(categoria.slug)
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#2D5016] font-medium mb-4">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{categoria.emoji}</span>
        <h2 className="font-bold text-lg text-[#36454F]">{categoria.nome}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Sem itens nesta categoria.</p>
      ) : (
        <div className="bg-white border border-[#E7E8D1] rounded-xl overflow-hidden">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} onClick={() => onSelectItem(item)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GuiaClient({ campoId: _campoId }: { campoId: string }) {
  const [view, setView] = useState<View>('hub')
  const [selectedCat, setSelectedCat] = useState<GuiaCategoria | null>(null)
  const [selectedItem, setSelectedItem] = useState<GuiaItem | null>(null)
  const [query, setQuery] = useState('')

  const searchResults = useMemo(() => pesquisar(query), [query])

  function openItem(item: GuiaItem) {
    setSelectedItem(item)
    setView('item')
  }

  function openCategoria(cat: GuiaCategoria) {
    setSelectedCat(cat)
    setView('categoria')
  }

  function goBack() {
    if (view === 'item' && selectedCat) {
      setSelectedItem(null)
      setView('categoria')
    } else if (view === 'item' && query) {
      setSelectedItem(null)
      setView('pesquisa')
    } else if (view === 'item') {
      setSelectedItem(null)
      setView('hub')
    } else {
      setSelectedItem(null)
      setSelectedCat(null)
      setQuery('')
      setView('hub')
    }
  }

  if (view === 'item' && selectedItem) {
    return <ItemDetalhe item={selectedItem} onBack={goBack} />
  }

  if (view === 'urgencias') {
    return <UrgenciasView onSelectItem={openItem} onBack={() => setView('hub')} />
  }

  if (view === 'categoria' && selectedCat) {
    return <CategoriaView categoria={selectedCat} onSelectItem={openItem} onBack={() => setView('hub')} />
  }

  // Hub + pesquisa
  const showSearch = query.length >= 2

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-4">
      {/* Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Pesquisar — febre, diarreia, ibuprofeno…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-9 py-3 border border-[#E7E8D1] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showSearch ? (
        /* Resultados de pesquisa */
        <div>
          <p className="text-xs text-gray-400 mb-2">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{query}"</p>
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sem resultados. Tenta outra palavra.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E7E8D1] rounded-xl overflow-hidden">
              {searchResults.map((item) => {
                const cat = categoriaBySlug(item.categoriaSlug)
                return (
                  <button
                    key={item.id}
                    onClick={() => openItem(item)}
                    className={cn(
                      'w-full text-left flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1] last:border-b-0',
                      item.urgencia === 'emergencia_112' && 'border-l-4 border-l-red-500',
                      item.urgencia === 'hospital' && 'border-l-4 border-l-orange-400',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-[#36454F]">{item.titulo}</span>
                        <UrgenciaBadge urgencia={item.urgencia} />
                      </div>
                      {cat && (
                        <p className="text-xs text-gray-400 mt-0.5">{cat.emoji} {cat.nome}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Strip de urgências */}
          <button
            onClick={() => setView('urgencias')}
            className="w-full bg-red-600 text-white rounded-xl p-4 text-left flex items-center justify-between active:opacity-80"
          >
            <div>
              <p className="font-black text-base">🆘 Urgências / 112</p>
              <p className="text-xs opacity-90 mt-0.5">Convulsões, anafilaxia, engasgamento, pancada na cabeça</p>
            </div>
            <ChevronRight className="h-5 w-5 opacity-80 shrink-0" />
          </button>

          {/* Grid de categorias */}
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => openCategoria(cat)}
                className={cn(
                  'rounded-xl border p-4 text-left space-y-1.5 active:opacity-80',
                  cat.cor,
                )}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <p className="font-bold text-sm">{cat.nome}</p>
                <p className="text-xs opacity-70">{cat.descricao}</p>
              </button>
            ))}
          </div>

          {/* Aviso */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 italic">
              Em caso de dúvida ou desconhecimento, não dar nada e contactar um responsável ou médico.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
