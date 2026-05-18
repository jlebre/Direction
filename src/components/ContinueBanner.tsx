'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'

interface LastCampo {
  id: string
  nome: string
  path: string
}

export function ContinueBanner() {
  const [last, setLast] = useState<LastCampo | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lastCampo')
      if (saved) setLast(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  if (!last) return null

  return (
    <div className="px-4 pb-4">
      <Link href={last.path}>
        <div className="bg-white/15 border border-white/25 rounded-xl p-3 flex items-center gap-3 hover:bg-white/20 transition-colors active:scale-[0.98]">
          <Clock className="h-4 w-4 text-white/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold">Continuar</p>
            <p className="text-white/75 text-xs truncate">{last.nome}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-white/70 shrink-0" />
        </div>
      </Link>
    </div>
  )
}
