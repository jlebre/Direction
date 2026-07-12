'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, X, AlertCircle, ChevronDown, ChevronUp, Download } from 'lucide-react'
import type { Campo } from '@/types/shared'
import type { OrcamentoItem, EstimativaItem, DiaBreakdown } from '@/types/mamas'
import { REFEICAO_LABELS } from '@/types/mamas'
import { formatCurrency, formatQuantidade, parseMoney } from '@/lib/utils'

type CorEscalao = { bg: string; text: string; light: string; border: string }
type GastoReal = { label: string; real: number; previsto: number }

const CATEGORIAS_EXTRA = [
  { value: 'limpeza', label: 'Limpeza', emoji: '🧹' },
  { value: 'miminhos', label: 'Miminhos / Noite', emoji: '🍫' },
  { value: 'consumiveis', label: 'Consumíveis', emoji: '📦' },
  { value: 'outro', label: 'Outro', emoji: '📋' },
]

const UNIDADES_EXTRA = ['€ total', 'un', 'kg', 'L', 'cx', 'emb', 'pacote']

interface OrcamentoViewProps {
  campo: Campo
  estimativas: EstimativaItem[]
  extrasIniciais: OrcamentoItem[]
  corEscalao: CorEscalao
  totalPrevisto: number | null
  gastosReais?: GastoReal[]
  diasBreakdown?: DiaBreakdown[]
}

type AddForm = {
  categoria: string
  nome: string
  preco_total: string
  notas: string
}

export function OrcamentoView({
  campo,
  estimativas,
  extrasIniciais,
  corEscalao,
  totalPrevisto,
  gastosReais = [],
  diasBreakdown = [],
}: OrcamentoViewProps) {
  const [extras, setExtras] = useState<OrcamentoItem[]>(extrasIniciais)
  const [mostrarEstimativas, setMostrarEstimativas] = useState(false)
  const [diaAberto, setDiaAberto] = useState<number | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [exportando, setExportando] = useState(false)

  async function handleExport() {
    setExportando(true)
    try {
      const { exportOrcamento } = await import('@/lib/mamas/export-orcamento')
      await exportOrcamento(campo, estimativas, extras, totalPrevisto, diasBreakdown)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setExportando(false)
    }
  }

  const supabase = createClient()

  const totalEstimado = estimativas.reduce((sum, e) => sum + (e.total ?? 0), 0)
  const semPreco = estimativas.filter((e) => e.total === null).length
  const totalExtras = extras.reduce((sum, e) => sum + ((e.preco_unit ?? 0)), 0)
  const totalGeral = totalEstimado + totalExtras

  async function removerExtra(id: string) {
    setExtras((prev) => prev.filter((e) => e.id !== id))
    const { error } = await supabase.from('orcamento_itens').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao remover item')
      setExtras(extrasIniciais)
    }
  }

  async function adicionarExtra(form: AddForm) {
    setSalvando(true)
    try {
      const { data, error } = await supabase
        .from('orcamento_itens')
        .insert({
          campo_id: campo.id,
          categoria: form.categoria,
          nome: form.nome.trim(),
          preco_unit: form.preco_total ? (parseMoney(form.preco_total) ?? null) : null,
          notas: form.notas.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      setExtras((prev) => [...prev, data as OrcamentoItem])
      setAddSheetOpen(false)
      toast.success('Extra adicionado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar')
    } finally {
      setSalvando(false)
    }
  }

  const extrasPorCategoria = CATEGORIAS_EXTRA.map((cat) => ({
    ...cat,
    items: extras.filter((e) => e.categoria === cat.value),
  })).filter((cat) => cat.items.length > 0)

  const extrasOutros = extras.filter(
    (e) => !CATEGORIAS_EXTRA.find((c) => c.value === e.categoria)
  )

  return (
    <div className="space-y-4">

      {/* Resumo financeiro */}
      <div className="bg-white rounded-xl border border-[#E7E8D1] p-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Resumo financeiro
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Estimativa receitas</span>
            <div className="text-right">
              <span className="font-semibold text-[#36454F]">
                {totalEstimado > 0 ? formatCurrency(totalEstimado) : '—'}
              </span>
              {semPreco > 0 && (
                <p className="text-[10px] text-amber-500">
                  {semPreco} ingrediente{semPreco > 1 ? 's' : ''} sem preço
                </p>
              )}
            </div>
          </div>
          {totalExtras > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Extras manuais</span>
              <span className="font-semibold text-[#36454F]">{formatCurrency(totalExtras)}</span>
            </div>
          )}
          <div className="border-t border-[#E7E8D1] pt-2 flex justify-between text-sm font-bold">
            <span className="text-[#36454F]">Total estimado</span>
            <span style={{ color: corEscalao.bg }}>
              {totalGeral > 0 ? formatCurrency(totalGeral) : '—'}
            </span>
          </div>
          {totalPrevisto !== null && totalPrevisto > 0 && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Orçamento previsto</span>
              <span>{formatCurrency(totalPrevisto)}</span>
            </div>
          )}
          {totalPrevisto !== null && totalPrevisto > 0 && totalGeral > 0 && (
            <div
              className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-2 ${
                totalGeral > totalPrevisto
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>
                {totalGeral > totalPrevisto
                  ? `${formatCurrency(totalGeral - totalPrevisto)} acima do previsto`
                  : `${formatCurrency(totalPrevisto - totalGeral)} abaixo do previsto`}
              </span>
            </div>
          )}
          {estimativas.length === 0 && extras.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Define a ementa e preços, ou adiciona extras manualmente.</span>
            </div>
          )}
        </div>
        {(estimativas.length > 0 || extras.length > 0) && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exportando}
            className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2D5016] transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exportando ? 'A exportar...' : 'Exportar orçamento (.xlsx)'}
          </button>
        )}
      </div>

      {/* Por dia e refeição */}
      {diasBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E7E8D1]">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Por dia e refeição ({diasBreakdown.length} dia{diasBreakdown.length !== 1 ? 's' : ''})
            </h2>
          </div>
          <div className="divide-y divide-[#E7E8D1]">
            {diasBreakdown.map((dia) => {
              const isOpen = diaAberto === dia.dia
              const semPreco = dia.refeicoes.some((r) => r.total === null)
              return (
                <div key={dia.dia}>
                  <button
                    type="button"
                    onClick={() => setDiaAberto(isOpen ? null : dia.dia)}
                    className="w-full flex items-center px-4 py-3 gap-3 hover:bg-[#f8f8f4] transition-colors text-left"
                  >
                    <span className="flex-1 text-sm font-semibold text-[#36454F] truncate">
                      {dia.label}
                    </span>
                    {semPreco ? (
                      <span className="text-xs text-amber-500 shrink-0">preços parciais</span>
                    ) : (
                      <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: corEscalao.bg }}>
                        {dia.total !== null ? formatCurrency(dia.total) : '—'}
                      </span>
                    )}
                    {isOpen
                      ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    }
                  </button>
                  {isOpen && (
                    <div className="bg-[#f8f8f4] border-t border-[#E7E8D1] divide-y divide-[#E7E8D1]">
                      {dia.refeicoes.map((ref) => (
                        <div key={ref.refeicao} className="flex items-center px-6 py-2.5 gap-2 text-sm">
                          <span className="flex-1 text-gray-600">
                            {REFEICAO_LABELS[ref.refeicao] ?? ref.refeicao}
                          </span>
                          {ref.numPessoas !== null && (
                            <span className="text-xs text-gray-400 tabular-nums shrink-0">
                              {ref.numPessoas} pess.
                            </span>
                          )}
                          <span
                            className={`text-sm font-medium tabular-nums shrink-0 ${ref.total === null ? 'text-amber-500' : ''}`}
                            style={ref.total !== null ? { color: corEscalao.bg } : undefined}
                          >
                            {ref.total !== null ? formatCurrency(ref.total) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gastos reais de alimentação */}
      {gastosReais.some((g) => g.real > 0 || g.previsto > 0) && (
        <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E7E8D1]">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Gastos reais — alimentação
            </h2>
          </div>
          <div className="divide-y divide-[#E7E8D1]">
            {gastosReais.map((g) => {
              const diff = g.previsto > 0 ? g.real - g.previsto : null
              const acima = diff !== null && diff > 0
              return (
                <div key={g.label} className="flex items-center px-4 py-2.5 gap-2 text-sm">
                  <span className="flex-1 text-[#36454F] truncate">{g.label}</span>
                  <span className="text-gray-400 tabular-nums w-16 text-right">
                    {g.previsto > 0 ? formatCurrency(g.previsto) : '—'}
                  </span>
                  <span className="font-semibold tabular-nums w-16 text-right" style={{ color: corEscalao.bg }}>
                    {g.real > 0 ? formatCurrency(g.real) : '—'}
                  </span>
                  {diff !== null && (
                    <span
                      className={`text-xs tabular-nums w-16 text-right font-medium ${
                        acima ? 'text-red-500' : 'text-green-600'
                      }`}
                    >
                      {acima ? '+' : ''}{formatCurrency(diff)}
                    </span>
                  )}
                </div>
              )
            })}
            {/* Totais */}
            {(() => {
              const totalPrev = gastosReais.reduce((s, g) => s + g.previsto, 0)
              const totalReal = gastosReais.reduce((s, g) => s + g.real, 0)
              const diffTotal = totalPrev > 0 ? totalReal - totalPrev : null
              const acima = diffTotal !== null && diffTotal > 0
              return (
                <div className="flex items-center px-4 py-2.5 gap-2 text-sm font-bold bg-[#f8f8f4]">
                  <span className="flex-1 text-[#36454F]">Total alimentação</span>
                  <span className="text-gray-400 tabular-nums w-16 text-right">
                    {totalPrev > 0 ? formatCurrency(totalPrev) : '—'}
                  </span>
                  <span className="tabular-nums w-16 text-right" style={{ color: corEscalao.bg }}>
                    {totalReal > 0 ? formatCurrency(totalReal) : '—'}
                  </span>
                  {diffTotal !== null && (
                    <span
                      className={`text-xs tabular-nums w-16 text-right font-semibold ${
                        acima ? 'text-red-500' : 'text-green-600'
                      }`}
                    >
                      {acima ? '+' : ''}{formatCurrency(diffTotal)}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
          <div className="px-4 py-2 border-t border-[#E7E8D1]">
            <p className="text-[10px] text-gray-400">
              Previsto · Real · Diferença — valores das despesas registadas com código 3.1.x
            </p>
          </div>
        </div>
      )}

      {/* Estimativa por ingrediente (colapsível) */}
      {estimativas.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
          <button
            onClick={() => setMostrarEstimativas((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f8f8f4] transition-colors"
          >
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Estimativa por ingrediente ({estimativas.length})
            </span>
            {mostrarEstimativas ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {mostrarEstimativas && (
            <div className="border-t border-[#E7E8D1] divide-y divide-[#E7E8D1]">
              {semPreco > 0 && (
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {semPreco} ingrediente{semPreco > 1 ? 's' : ''} sem preço — total parcial.
                  </span>
                </div>
              )}
              {estimativas.map((est) => (
                <div key={est.id} className="flex items-center px-4 py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#36454F] truncate">{est.nome}</p>
                    <p className="text-xs text-gray-400">{est.categoria}</p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="text-[#36454F]">
                      {formatQuantidade(est.quantidade, est.unidade)}
                    </p>
                    {est.preco !== null ? (
                      <p className="text-xs font-semibold" style={{ color: corEscalao.bg }}>
                        {formatCurrency(est.total ?? 0)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-300">sem preço</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extras manuais */}
      <div className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1]">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Extras manuais
          </span>
          <button
            onClick={() => setAddSheetOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: corEscalao.bg }}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>

        {extras.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            Nenhum extra. Adiciona limpeza, miminhos, consumíveis, etc.
          </div>
        ) : (
          <div className="divide-y divide-[#E7E8D1]">
            {extrasPorCategoria.map((cat) => (
              <div key={cat.value}>
                <div className="bg-[#f8f8f4] px-4 py-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatCurrency(cat.items.reduce((s, e) => s + (e.preco_unit ?? 0), 0))}
                  </span>
                </div>
                {cat.items.map((extra) => (
                  <div key={extra.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#36454F] truncate">
                        {extra.nome}
                      </p>
                      {extra.notas && (
                        <p className="text-xs text-gray-400 truncate">{extra.notas}</p>
                      )}
                    </div>
                    {extra.preco_unit !== null && (
                      <p className="text-sm font-semibold shrink-0" style={{ color: corEscalao.bg }}>
                        {formatCurrency(extra.preco_unit)}
                      </p>
                    )}
                    <button
                      onClick={() => removerExtra(extra.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            {extrasOutros.map((extra) => (
              <div key={extra.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#36454F] truncate">{extra.nome}</p>
                  <p className="text-xs text-gray-400">{extra.categoria}</p>
                </div>
                {extra.preco_unit !== null && (
                  <p className="text-sm font-semibold shrink-0" style={{ color: corEscalao.bg }}>
                    {formatCurrency(extra.preco_unit)}
                  </p>
                )}
                <button
                  onClick={() => removerExtra(extra.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet para adicionar extra */}
      {addSheetOpen && (
        <AddExtraSheet
          salvando={salvando}
          corEscalao={corEscalao}
          onClose={() => setAddSheetOpen(false)}
          onAdd={adicionarExtra}
        />
      )}
    </div>
  )
}

function AddExtraSheet({
  salvando,
  corEscalao,
  onClose,
  onAdd,
}: {
  salvando: boolean
  corEscalao: CorEscalao
  onClose: () => void
  onAdd: (form: AddForm) => void
}) {
  const [form, setForm] = useState<AddForm>({
    categoria: 'limpeza',
    nome: '',
    preco_total: '',
    notas: '',
  })

  function handleSubmit() {
    if (!form.nome.trim()) return
    onAdd(form)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1] shrink-0">
          <span className="font-bold text-[#36454F] text-sm">Adicionar extra</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#E7E8D1] transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Categoria */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              Categoria
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS_EXTRA.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, categoria: cat.value }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    form.categoria === cat.value
                      ? 'text-white border-transparent'
                      : 'border-[#E7E8D1] text-gray-600 hover:border-gray-300'
                  }`}
                  style={
                    form.categoria === cat.value
                      ? { backgroundColor: corEscalao.bg }
                      : undefined
                  }
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Nome</label>
            <input
              autoFocus
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && form.nome.trim() && handleSubmit()}
              placeholder="ex: Detergente, Chocolates da noite..."
              className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:border-[#2D5016]"
            />
          </div>

          {/* Preço */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              Custo estimado (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={form.preco_total}
              onChange={(e) => setForm((f) => ({ ...f, preco_total: e.target.value }))}
              placeholder="ex: 15,00"
              className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:border-[#2D5016]"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              Notas (opcional)
            </label>
            <input
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="ex: Comprar no Continente"
              className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:border-[#2D5016]"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.nome.trim() || salvando}
            className="w-full text-white font-semibold py-4 rounded-xl disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: corEscalao.bg }}
          >
            {salvando ? 'A guardar...' : 'Adicionar extra'}
          </button>
          <div className="h-[calc(env(safe-area-inset-bottom)+8px)]" />
        </div>
      </div>
    </>
  )
}
