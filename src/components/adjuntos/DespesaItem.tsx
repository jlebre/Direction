'use client'

import Link from 'next/link'
import type { Despesa } from '@/types/adjuntos'
import { getCodeColor } from '@/lib/adjuntos/codes'

interface Props {
  despesa: Despesa
  campoId: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

export default function DespesaItem({ despesa, campoId }: Props) {
  const color = getCodeColor(despesa.codigo)
  const isReceita = despesa.tipo === 'receita'

  return (
    <Link href={`/campo/${campoId}/adjuntos/despesa/${despesa.id}`}>
      <div className="flex items-center gap-3 py-3 px-4 bg-white rounded-lg border border-gray-100 active:bg-gray-50 transition-colors">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-500">#{despesa.numero_recibo}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{despesa.descricao ?? <span className="text-gray-400 italic">Sem descrição</span>}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{formatDate(despesa.data)}</span>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color + '20', color }}
            >
              {despesa.codigo}
            </span>
            {despesa.foto_path && <span className="text-xs text-gray-400">📷</span>}
            {despesa.is_regularizacao_nif && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">reg. NIF</span>
            )}
            {!despesa.nif_confirmado && despesa.tipo === 'despesa' && !despesa.is_regularizacao_nif && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">sem NIF</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-base font-bold ${isReceita ? 'text-green-600' : 'text-gray-900'}`}>
            {isReceita ? '+' : '−'}€{Number(despesa.valor).toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  )
}
