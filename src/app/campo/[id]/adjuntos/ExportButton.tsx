'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { generateExcel } from '@/lib/adjuntos/export-excel'
import type { Campo } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'

export default function ExportButton({ campo }: { campo: Campo }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('despesas')
        .select('*')
        .eq('campo_id', campo.id)
        .order('numero_recibo', { ascending: true })
      generateExcel(campo, (data ?? []) as Despesa[])
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 text-red-200 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-900/30 active:bg-red-900/50 disabled:opacity-60"
    >
      {loading ? '...' : '⬇ Excel'}
    </button>
  )
}
