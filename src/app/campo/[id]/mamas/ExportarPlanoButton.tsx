'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Campo } from '@/types/shared'
import type { EmentaItem, CampoDia } from '@/types/mamas'

interface Props {
  campo: Campo
  diasList: number[]
  campoDias?: CampoDia[]
}

export function ExportarPlanoButton({ campo, diasList, campoDias = [] }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleExport() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ementa')
        .select(`*, receita:receitas(
          id, nome,
          receita_ingredientes(
            ingrediente_id,
            quantidade_mosquitos,
            quantidade_aranh_melgas,
            quantidade_cam_trem,
            unidade,
            ingrediente:ingredientes(nome, categoria_supermercado)
          )
        )`)
        .eq('campo_id', campo.id)
        .order('ordem')
      if (error) throw error
      const { exportPlanoRefeicoes } = await import('@/lib/mamas/export-plano-refeicoes')
      await exportPlanoRefeicoes(campo, (data ?? []) as EmentaItem[], diasList, campoDias)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 text-green-200 text-sm font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-60 transition-colors"
    >
      {loading ? 'A exportar...' : '⬇ Exportar'}
    </button>
  )
}
