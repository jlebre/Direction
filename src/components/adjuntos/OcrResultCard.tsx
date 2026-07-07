'use client'

import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { OcrStatus, OcrResultado } from '@/hooks/useOcr'

interface OcrResultCardProps {
  status: OcrStatus
  progress: number
  statusMsg: string
  resultado: OcrResultado | null
  onUsar: (total: number | null, data: string | null, fornecedor: string | null) => void
}

export function OcrResultCard({ status, progress, statusMsg, resultado, onUsar }: OcrResultCardProps) {
  const [mostrarLinhas, setMostrarLinhas] = useState(false)

  if (status === 'idle') return null

  if (status === 'a_carregar' || status === 'a_processar') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm font-medium text-blue-700">{statusMsg || 'A interpretar...'}</p>
        </div>
        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress < 30 && (
          <p className="text-xs text-blue-500">
            Na primeira utilização, o modelo de OCR é transferido (~15MB). Pode demorar um pouco.
          </p>
        )}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700">
          Não foi possível interpretar a fatura. Introduz os valores manualmente.
        </p>
      </div>
    )
  }

  if (status === 'done' && resultado) {
    const temDados = resultado.total_detectado !== null || resultado.fornecedor || resultado.data_detectada
    const nLinhas = resultado.linhas.length

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
        <div className="p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-700">Fatura interpretada</p>
          </div>

          {!temDados && (
            <p className="text-xs text-amber-600">
              Nenhum dado reconhecido com confiança. Verifica a qualidade da foto.
            </p>
          )}

          {temDados && (
            <div className="bg-white/70 rounded-lg divide-y divide-green-100 text-sm">
              {resultado.total_detectado !== null && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-green-700">
                    €{resultado.total_detectado.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
              {resultado.fornecedor && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-gray-500">Fornecedor</span>
                  <span className="font-medium text-gray-800">{resultado.fornecedor}</span>
                </div>
              )}
              {resultado.data_detectada && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-gray-500">Data</span>
                  <span className="font-medium text-gray-800">
                    {formatarData(resultado.data_detectada)}
                  </span>
                </div>
              )}
              {nLinhas > 0 && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-gray-500">Produtos</span>
                  <span className="font-medium text-gray-800">{nLinhas} linhas</span>
                </div>
              )}
            </div>
          )}

          {temDados && (
            <button
              type="button"
              onClick={() =>
                onUsar(resultado.total_detectado, resultado.data_detectada, resultado.fornecedor)
              }
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Usar estes valores →
            </button>
          )}

          {nLinhas > 0 && (
            <button
              type="button"
              onClick={() => setMostrarLinhas((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-green-600 py-1"
            >
              {mostrarLinhas ? (
                <>Ocultar linhas <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Ver {nLinhas} linhas detectadas <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          )}
        </div>

        {mostrarLinhas && nLinhas > 0 && (
          <div className="border-t border-green-200 divide-y divide-green-100 max-h-48 overflow-y-auto">
            {resultado.linhas.map((l, i) => (
              <div key={i} className="flex items-start justify-between px-3 py-2 gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{l.nome_produto_bruto}</p>
                  {l.quantidade !== null && (
                    <p className="text-[10px] text-gray-400">
                      {l.quantidade} {l.unidade ?? ''}
                      {l.preco_unitario !== null ? ` × €${l.preco_unitario.toFixed(2)}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-green-700 shrink-0">
                  €{(l.preco_total ?? 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
