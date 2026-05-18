'use client'

import { useState } from 'react'
import { CODE_CATEGORIES } from '@/lib/adjuntos/codes'

interface Props {
  selected: string | null
  onSelect: (code: string, description: string) => void
}

export default function CodeSelector({ selected, onSelect }: Props) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {CODE_CATEGORIES.map((cat) => {
        const isExpanded = expandedCat === cat.label
        const hasSelected = cat.codes.some((c) => c.code === selected)

        return (
          <div key={cat.label} className="rounded-xl overflow-hidden border border-gray-100">
            <button
              type="button"
              onClick={() => setExpandedCat(isExpanded ? null : cat.label)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
                hasSelected ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <span className="font-semibold text-base">{cat.label}</span>
                {hasSelected && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/20">
                    {cat.codes.find((c) => c.code === selected)?.short}
                  </span>
                )}
              </div>
              <span className="text-lg">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {cat.codes.map((c) => {
                  const isSelected = selected === c.code
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { onSelect(c.code, c.full); setExpandedCat(null) }}
                      className={`w-full flex items-center justify-between px-4 py-4 text-left border-b border-gray-50 last:border-0 transition-colors ${
                        isSelected ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 active:bg-gray-50'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-base block">{c.short}</span>
                        <span className={`text-xs mt-0.5 block ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                          {c.full}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded"
                          style={{
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : cat.color + '20',
                            color: isSelected ? 'white' : cat.color,
                          }}
                        >
                          {c.code}
                        </span>
                        {isSelected && <span className="text-green-400">✓</span>}
                      </div>
                    </button>
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
