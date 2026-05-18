'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatQuantidade } from '@/lib/utils'
import type { SeccaoTipo } from '@/types/shared'
import { calcularQuantidade } from '@/types/mamas'

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
}

const COLUNAS = [
  { key: 'mosquitos', label: 'Mosquitos', seccoes: ['mosquitos'] },
  { key: 'aranh_melgas', label: 'Aranhiços / Melgas', seccoes: ['aranhicos', 'melgas'] },
  { key: 'cam_trem', label: 'Camaleões / Tremelgas', seccoes: ['camaleoes', 'tremelgas'] },
] as const

export function IngredientesTable({ ingredientes, seccao, totalPessoas }: Props) {
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const colunas = COLUNAS.map((c) => ({
    ...c,
    isAtivo: c.seccoes.includes(seccao as never),
  }))

  const getQtd = (ri: IngredienteRow, key: string): number => {
    if (key === 'mosquitos') return ri.quantidade_mosquitos
    if (key === 'aranh_melgas') return ri.quantidade_aranh_melgas
    return ri.quantidade_cam_trem
  }

  return (
    <div>
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
                    col.isAtivo ? 'text-[#B85042]' : cn('text-gray-400', !mostrarTodos && 'hidden sm:table-cell')
                  )}
                >
                  {col.isAtivo ? `${col.label} ★` : col.label}
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
                  const isAtivo = col.isAtivo
                  const raw = getQtd(ri, col.key)
                  const qty = isAtivo
                    ? calcularQuantidade(seccao, ri.quantidade_mosquitos, ri.quantidade_aranh_melgas, ri.quantidade_cam_trem, totalPessoas)
                    : raw
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'text-right px-3 py-2.5 font-mono text-xs',
                        isAtivo ? 'text-[#B85042] font-bold' : cn('text-gray-400', !mostrarTodos && 'hidden sm:table-cell')
                      )}
                    >
                      {raw ? formatQuantidade(qty, ri.unidade) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile toggle */}
      <div className="sm:hidden px-4 py-2 border-t border-[#E7E8D1]">
        <button
          onClick={() => setMostrarTodos((v) => !v)}
          className="text-xs text-[#B85042] hover:underline font-medium"
        >
          {mostrarTodos ? '▲ Esconder outros escalões' : '▼ Ver todos os escalões'}
        </button>
      </div>
    </div>
  )
}
