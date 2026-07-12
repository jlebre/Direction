'use client'

import { useState } from 'react'
import { CODE_CATEGORIES } from '@/lib/adjuntos/codes'
import { VALORES_REF_VERAO } from '@/lib/adjuntos/valores-referencia'

interface Props {
  escalao: string
  porCodigo: Record<string, number>
  valoresRefDb?: Record<string, number>
}

export default function BudgetBar({ escalao, porCodigo, valoresRefDb }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const refTable = valoresRefDb ?? VALORES_REF_VERAO[escalao] ?? {}

  return (
    <div className="space-y-2">
      {CODE_CATEGORIES.map((cat) => {
        const catTotal = cat.codes.reduce((s, c) => s + (porCodigo[c.code] ?? 0), 0)
        const catRef = cat.codes.reduce((s, c) => s + (refTable[c.code] ?? 0), 0)
        const pct = catRef > 0 ? Math.min((catTotal / catRef) * 100, 100) : 0
        const isExpanded = expanded === cat.label
        const barColor = pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#2D5016'

        if (catRef === 0 && catTotal === 0) return null

        return (
          <div key={cat.label} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : cat.label)}
              className="w-full px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="font-medium text-sm text-gray-800">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">€{catTotal.toFixed(2)}</span>
                  {catRef > 0 && <span className="text-xs text-gray-400">/ €{catRef.toFixed(2)}</span>}
                  <span className="text-xs text-gray-300">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              {catRef > 0 && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                </div>
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-2">
                {cat.codes.map((c) => {
                  const spent = porCodigo[c.code] ?? 0
                  const ref = refTable[c.code] ?? 0
                  const subPct = ref > 0 ? Math.min((spent / ref) * 100, 100) : 0
                  const subColor = subPct > 90 ? '#EF4444' : subPct > 70 ? '#F59E0B' : '#2D5016'
                  if (ref === 0 && spent === 0) return null
                  return (
                    <div key={c.code}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{c.short}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold">€{spent.toFixed(2)}</span>
                          {ref > 0 && <span className="text-xs text-gray-400">/ €{ref.toFixed(2)}</span>}
                        </div>
                      </div>
                      {ref > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${subPct}%`, backgroundColor: subColor }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
