'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { exportPlanoRefeicoes } from '@/lib/mamas/export-plano-refeicoes'
import type { Campo } from '@/types/shared'
import type { EmentaItem } from '@/types/mamas'

interface Props {
  campo: Campo
  diasList: number[]
}

export function ExportarPlanoButton({ campo, diasList }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleExport() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ementa')
        .select('*, receita:receitas(id, nome)')
        .eq('campo_id', campo.id)
        .order('ordem')
      if (error) throw error
      exportPlanoRefeicoes(campo, (data ?? []) as EmentaItem[], diasList)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors disabled:opacity-60"
    >
      <Download className="h-4 w-4" />
      {loading ? 'A exportar...' : 'Exportar Plano'}
    </button>
  )
}
