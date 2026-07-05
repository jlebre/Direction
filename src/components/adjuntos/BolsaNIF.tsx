'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif } from '@/types/adjuntos'

interface Props {
  campo: Campo
  faturasSemNIF: Despesa[]
  regularizacoes: RegularizacaoNif[]
}

type EstadoFatura = 'pendente' | 'parcial' | 'regularizada'

interface FaturaComEstado extends Despesa {
  valorPendente: number
  estado: EstadoFatura
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  })
}

export default function BolsaNIF({ campo, faturasSemNIF, regularizacoes }: Props) {
  const [showDetail, setShowDetail] = useState(false)

  const faturasComEstado: FaturaComEstado[] = faturasSemNIF.map((f) => {
    const totalReg = regularizacoes
      .filter((r) => r.despesa_original_id === f.id)
      .reduce((s, r) => s + Number(r.valor), 0)
    const valorPendente = Math.max(0, Number(f.valor) - totalReg)
    let estado: EstadoFatura
    if (totalReg === 0) estado = 'pendente'
    else if (valorPendente > 0.005) estado = 'parcial'
    else estado = 'regularizada'
    return { ...f, valorPendente, estado }
  })

  const pendentes = faturasComEstado.filter((f) => f.estado === 'pendente')
  const parciais = faturasComEstado.filter((f) => f.estado === 'parcial')
  const regularizadas = faturasComEstado.filter((f) => f.estado === 'regularizada')

  const totalEmAberto = faturasComEstado.reduce((s, f) => s + f.valorPendente, 0)
  const totalBolsa = faturasSemNIF.reduce((s, f) => s + Number(f.valor), 0)
  const totalRegularizado = totalBolsa - totalEmAberto

  if (faturasSemNIF.length === 0) return null

  const hasPending = pendentes.length > 0 || parciais.length > 0

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <h3 className="text-sm font-bold text-amber-900">Bolsa NIF</h3>
          </div>
          {hasPending && (
            <Link
              href={`/campo/${campo.id}/adjuntos/regularizar`}
              className="text-xs font-semibold text-white bg-amber-600 px-3 py-1.5 rounded-lg active:opacity-80"
            >
              Regularizar
            </Link>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-amber-700">Em aberto</p>
            <p className="text-lg font-bold text-amber-900 mt-0.5">€{totalEmAberto.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-amber-700">Regularizado</p>
            <p className="text-lg font-bold text-green-700 mt-0.5">€{totalRegularizado.toFixed(2)}</p>
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

      {showDetail && (
        <div className="border-t border-amber-200">
          {/* Por regularizar */}
          {hasPending && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                Por regularizar ({pendentes.length + parciais.length})
              </p>
              <div className="space-y-2">
                {[...pendentes, ...parciais].map((f) => (
                  <FaturaRow key={f.id} fatura={f} campoId={campo.id} />
                ))}
              </div>
            </div>
          )}

          {/* Regularizadas */}
          {regularizadas.length > 0 && (
            <div className={`px-4 py-3 ${hasPending ? 'border-t border-amber-100' : ''}`}>
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                Regularizadas ({regularizadas.length})
              </p>
              <div className="space-y-2">
                {regularizadas.map((f) => (
                  <FaturaRow key={f.id} fatura={f} campoId={campo.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FaturaRow({ fatura, campoId }: { fatura: FaturaComEstado; campoId: string }) {
  const { estado, valorPendente } = fatura

  const badgeClass =
    estado === 'pendente' ? 'bg-amber-100 text-amber-800' :
    estado === 'parcial'  ? 'bg-orange-100 text-orange-800' :
    'bg-green-100 text-green-800'

  const badgeLabel =
    estado === 'pendente' ? 'pendente' :
    estado === 'parcial'  ? `parcial · €${valorPendente.toFixed(2)}` :
    'regularizada'

  return (
    <Link href={`/campo/${campoId}/adjuntos/despesa/${fatura.id}`}>
      <div className="flex items-center justify-between text-sm py-1.5 active:opacity-70">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-amber-800 shrink-0 font-medium">#{fatura.numero_recibo}</span>
          {fatura.descricao && (
            <span className="text-amber-700 truncate text-xs">— {fatura.descricao}</span>
          )}
          {fatura.foto_path && <span className="text-xs text-amber-500 shrink-0">📷</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
            {badgeLabel}
          </span>
          <span className="font-medium text-amber-900">€{Number(fatura.valor).toFixed(2)}</span>
          <span className="text-xs text-amber-500">{formatDate(fatura.data)}</span>
        </div>
      </div>
    </Link>
  )
}
