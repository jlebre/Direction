'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { generateExcel } from '@/lib/adjuntos/export-excel'
import { generateZip } from '@/lib/adjuntos/export-zip'
import type { Campo } from '@/types/shared'
import type { Despesa, LiquidacaoNif } from '@/types/adjuntos'

export default function ExportButton({ campo }: { campo: Campo }) {
  const [loading, setLoading] = useState<'excel' | 'zip' | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchData() {
    const [{ data: despesas }, { data: liquidacoes }] = await Promise.all([
      supabase
        .from('despesas')
        .select('*')
        .eq('campo_id', campo.id)
        .order('numero_recibo', { ascending: true }),
      supabase
        .from('liquidacoes_nif')
        .select('*')
        .eq('campo_id', campo.id)
        .order('created_at', { ascending: false }),
    ])
    return {
      despesas: (despesas ?? []) as Despesa[],
      liquidacoes: (liquidacoes ?? []) as LiquidacaoNif[],
    }
  }

  async function handleExcel() {
    setOpen(false)
    setLoading('excel')
    try {
      const { despesas, liquidacoes } = await fetchData()
      generateExcel(campo, despesas, liquidacoes)
    } finally {
      setLoading(null)
    }
  }

  async function handleZip() {
    setOpen(false)
    setLoading('zip')
    try {
      const { despesas, liquidacoes } = await fetchData()
      await generateZip(campo, despesas, liquidacoes)
    } finally {
      setLoading(null)
    }
  }

  const label =
    loading === 'excel' ? 'A gerar...' :
    loading === 'zip' ? 'A comprimir...' :
    '⬇ Exportar'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!!loading}
        className="flex items-center gap-1.5 text-red-200 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-900/30 active:bg-red-900/50 disabled:opacity-60"
      >
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[180px]">
          <button
            type="button"
            onClick={handleExcel}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
          >
            <span className="text-xl">📊</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Excel</p>
              <p className="text-xs text-gray-400">Faturas + orçamento</p>
            </div>
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          <button
            type="button"
            onClick={handleZip}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
          >
            <span className="text-xl">🗜️</span>
            <div>
              <p className="text-sm font-medium text-gray-900">ZIP + Imagens</p>
              <p className="text-xs text-gray-400">Excel com pasta de fotos</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
