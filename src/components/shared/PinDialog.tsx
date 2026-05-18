'use client'

import { useState } from 'react'

interface Props {
  onConfirm: (pin: string) => void
  onCancel: () => void
  error?: boolean
  title?: string
  subtitle?: string
}

export default function PinDialog({
  onConfirm,
  onCancel,
  error,
  title = 'PIN do Campo',
  subtitle = 'Este campo requer um PIN para continuar.',
}: Props) {
  const [pin, setPin] = useState('')

  function handleDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) setTimeout(() => onConfirm(next), 100)
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1))
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs p-6">
        <h2 className="text-center font-bold text-lg text-gray-900 mb-1">{title}</h2>
        <p className="text-center text-sm text-gray-500 mb-6">{subtitle}</p>

        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? error
                    ? 'bg-red-500 border-red-500'
                    : 'bg-[#2D5016] border-[#2D5016]'
                  : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 mb-4 -mt-2">PIN incorreto. Tenta de novo.</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />
            return (
              <button
                key={i}
                type="button"
                onClick={() => (d === '⌫' ? handleDelete() : handleDigit(d))}
                className="h-14 rounded-xl bg-gray-100 text-xl font-semibold text-gray-800 active:bg-gray-200 transition-colors flex items-center justify-center"
              >
                {d}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-4 py-3 text-sm text-gray-400 font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
