'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Campo } from '@/types/shared'
import type { Despesa, LiquidacaoNif } from '@/types/adjuntos'
import Toast from '@/components/shared/Toast'

interface Props {
  campo: Campo
  faturasSemNIF: Despesa[]
  liquidacoes: LiquidacaoNif[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  })
}

export default function BolsaNIF({ campo, faturasSemNIF, liquidacoes }: Props) {
  const router = useRouter()
  const [showDetail, setShowDetail] = useState(false)
  const [showLiquidar, setShowLiquidar] = useState(false)
  const [liquidarValor, setLiquidarValor] = useState('')
  const [liquidarObs, setLiquidarObs] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const totalBolsa = faturasSemNIF.reduce((s, d) => s + Number(d.valor), 0)
  const totalLiquidado = liquidacoes.reduce((s, l) => s + Number(l.valor), 0)
  const emAberto = Math.max(0, totalBolsa - totalLiquidado)

  function openLiquidar() {
    setLiquidarValor(emAberto.toFixed(2))
    setLiquidarObs('')
    setShowLiquidar(true)
  }

  async function handleLiquidar() {
    const valor = parseFloat(liquidarValor)
    if (!valor || valor <= 0 || valor > emAberto) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('liquidacoes_nif').insert({
        campo_id: campo.id,
        valor,
        data: new Date().toISOString().split('T')[0],
        observacao: liquidarObs.trim() || null,
      })
      if (error) throw error
      setShowLiquidar(false)
      setToast({ msg: `€${valor.toFixed(2)} liquidados com sucesso.`, type: 'success' })
      router.refresh()
    } catch {
      setToast({ msg: 'Erro ao liquidar. Tenta de novo.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (emAberto === 0 && liquidacoes.length === 0) return null

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">💰</span>
              <h3 className="text-sm font-bold text-amber-900">Bolsa NIF</h3>
            </div>
            {emAberto > 0 && (
              <button
                type="button"
                onClick={openLiquidar}
                className="text-xs font-semibold text-white bg-amber-600 px-3 py-1.5 rounded-lg active:opacity-80"
              >
                Liquidar
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-amber-700">Em aberto</p>
              <p className="text-lg font-bold text-amber-900 mt-0.5">€{emAberto.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-amber-700">Liquidado</p>
              <p className="text-lg font-bold text-green-700 mt-0.5">€{totalLiquidado.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-amber-700">Faturas</p>
              <p className="text-lg font-bold text-amber-900 mt-0.5">{faturasSemNIF.length}</p>
            </div>
          </div>
        </div>

        {/* Toggle detalhe */}
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="w-full px-4 py-2.5 border-t border-amber-200 text-xs font-medium text-amber-700 text-left flex items-center justify-between active:bg-amber-100"
        >
          <span>{showDetail ? 'Fechar detalhe' : 'Ver detalhe'}</span>
          <span>{showDetail ? '▲' : '▼'}</span>
        </button>

        {/* Detalhe expansível */}
        {showDetail && (
          <div className="border-t border-amber-200 divide-y divide-amber-100">
            {/* Faturas sem NIF */}
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Faturas sem NIF</p>
              <div className="space-y-1.5">
                {faturasSemNIF.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-800">
                      #{d.numero_recibo} {d.descricao ? `— ${d.descricao}` : ''}
                    </span>
                    <span className="font-medium text-amber-900 ml-2 shrink-0">
                      €{Number(d.valor).toFixed(2)} <span className="text-xs text-amber-600">{formatDate(d.data)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liquidações */}
            {liquidacoes.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Liquidações</p>
                <div className="space-y-1.5">
                  {liquidacoes.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-sm">
                      <span className="text-green-700">
                        €{Number(l.valor).toFixed(2)}
                        {l.observacao && <span className="text-green-600 ml-1">— {l.observacao}</span>}
                      </span>
                      <span className="text-xs text-green-600 ml-2 shrink-0">{formatDate(l.data)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal liquidar */}
      {showLiquidar && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-1">Liquidar bolsa</h2>
            <p className="text-sm text-gray-500 mb-5">Em aberto: <span className="font-semibold text-amber-700">€{emAberto.toFixed(2)}</span></p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Valor a liquidar (€)</label>
                  <button
                    type="button"
                    onClick={() => setLiquidarValor(emAberto.toFixed(2))}
                    className="text-xs text-[#B85042] font-semibold"
                  >
                    Tudo
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    max={emAberto}
                    value={liquidarValor}
                    onChange={(e) => setLiquidarValor(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-4 py-3 text-xl font-bold focus:outline-none focus:border-[#B85042]"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
                <input
                  type="text"
                  value={liquidarObs}
                  onChange={(e) => setLiquidarObs(e.target.value)}
                  placeholder="Ex: Pagamento transferência julho"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#B85042]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLiquidar(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLiquidar}
                disabled={
                  submitting ||
                  !liquidarValor ||
                  parseFloat(liquidarValor) <= 0 ||
                  parseFloat(liquidarValor) > emAberto
                }
                className="flex-1 py-3 bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-40"
              >
                {submitting ? 'A guardar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  )
}
