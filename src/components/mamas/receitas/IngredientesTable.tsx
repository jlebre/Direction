'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatQuantidade } from '@/lib/utils'
import type { SeccaoTipo } from '@/types/shared'
import { SECCAO_LABELS } from '@/types/shared'
import { calcularQuantidade } from '@/types/mamas'
import { arredondarPratico } from '@/lib/mamas/fatores-escalao'

interface IngredienteRow {
  id: string
  quantidade_mosquitos: number
  quantidade_aranh_melgas: number
  quantidade_cam_trem: number
  unidade: string
  notas?: string
  ingrediente?: { nome: string }
}

interface Props {
  ingredientes: IngredienteRow[]
  seccao: SeccaoTipo
  totalPessoas: number
  naoVerificada?: boolean
}

type BandaKey = 'mosquitos' | 'aranh_melgas' | 'cam_trem'

const COLUNAS_TODAS: { key: BandaKey; label: string; seccoes: SeccaoTipo[] }[] = [
  { key: 'mosquitos', label: 'Mosquitos', seccoes: ['mosquitos'] },
  { key: 'aranh_melgas', label: 'Aranhiços / Melgas', seccoes: ['aranhicos', 'melgas'] },
  { key: 'cam_trem', label: 'Cam. / Tremelgas', seccoes: ['camaleoes', 'tremelgas'] },
]

function getBanda(seccao: SeccaoTipo): BandaKey {
  if (seccao === 'mosquitos') return 'mosquitos'
  if (seccao === 'aranhicos' || seccao === 'melgas') return 'aranh_melgas'
  return 'cam_trem'
}

function getQtdNativa(ri: IngredienteRow, banda: BandaKey): number {
  if (banda === 'mosquitos') return ri.quantidade_mosquitos
  if (banda === 'aranh_melgas') return ri.quantidade_aranh_melgas
  return ri.quantidade_cam_trem
}

export function IngredientesTable({ ingredientes, seccao, totalPessoas, naoVerificada }: Props) {
  const [verTodos, setVerTodos] = useState(false)
  const banda = getBanda(seccao)
  const seccaoLabel = SECCAO_LABELS[seccao] ?? seccao

  if (verTodos) {
    const colunas = COLUNAS_TODAS.map((c) => ({ ...c, isAtivo: c.seccoes.includes(seccao) }))
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">Todos os escalões</p>
          <button
            onClick={() => setVerTodos(false)}
            className="text-xs text-[#B85042] hover:underline font-medium"
          >
            ▲ Ver só {seccaoLabel}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E7E8D1]">
                <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs">Ingrediente</th>
                {colunas.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'text-right px-3 py-2 font-semibold text-xs whitespace-nowrap',
                      col.isAtivo ? 'text-[#B85042]' : 'text-gray-400'
                    )}
                  >
                    {col.isAtivo ? `${seccaoLabel} (atual)` : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ingredientes.map((ri) => (
                <tr key={ri.id} className="border-b border-[#E7E8D1] last:border-0 hover:bg-[#f8f8f4]">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-[#36454F]">{ri.ingrediente?.nome ?? '?'}</span>
                    {ri.notas && <span className="text-gray-400 text-xs ml-1.5">({ri.notas})</span>}
                  </td>
                  {colunas.map((col) => {
                    const raw = getQtdNativa(ri, col.key)
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'text-right px-3 py-2.5 font-mono text-xs',
                          col.isAtivo ? 'text-[#B85042] font-bold' : 'text-gray-400'
                        )}
                      >
                        {raw ? formatQuantidade(raw, ri.unidade) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Default: lista simples para o escalão atual
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">
          Quantidades para <span className="font-semibold text-[#36454F]">{seccaoLabel}</span>
          {naoVerificada && (
            <span className="ml-1.5 text-amber-600 font-medium">· por verificar</span>
          )}
        </p>
        <button
          onClick={() => setVerTodos(true)}
          className="text-xs text-gray-400 hover:text-[#B85042] transition-colors"
        >
          Ver todos ▼
        </button>
      </div>
      <div className="divide-y divide-[#E7E8D1]">
        {ingredientes.map((ri) => {
          const temQtdAlguma = ri.quantidade_mosquitos || ri.quantidade_aranh_melgas || ri.quantidade_cam_trem
          const qtdNativa = getQtdNativa(ri, banda)
          const calculada = !qtdNativa && !!temQtdAlguma
          const qtyEscalada = calcularQuantidade(
            seccao,
            ri.quantidade_mosquitos,
            ri.quantidade_aranh_melgas,
            ri.quantidade_cam_trem,
            totalPessoas,
          )
          const qty = arredondarPratico(qtyEscalada, ri.unidade)
          return (
            <div key={ri.id} className="flex items-start justify-between py-2.5 gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-[#36454F]">{ri.ingrediente?.nome ?? '?'}</span>
                {ri.notas && <span className="text-gray-400 text-xs ml-1.5">({ri.notas})</span>}
                {calculada && (
                  <p className="text-[10px] text-amber-600 mt-0.5">estimado a partir de outra banda</p>
                )}
              </div>
              <span className={cn(
                'text-sm font-semibold font-mono shrink-0 mt-0.5',
                calculada ? 'text-amber-600' : 'text-[#36454F]'
              )}>
                {temQtdAlguma ? formatQuantidade(qty, ri.unidade) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
