'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  type ListaCompras,
  type ListaComprasItem,
  type ZonaSupermercado,
  ZONA_LABELS,
} from '@/types/mamas'
import { cn, formatQuantidade } from '@/lib/utils'

const ZONA_ORDEM: ZonaSupermercado[] = [
  'talho',
  'peixaria',
  'padaria',
  'frutas_legumes',
  'lacticinios',
  'charcutaria',
  'massas_arroz',
  'enlatados',
  'mercearia',
  'bebidas_leite',
  'temperos',
  'congelados',
  'limpeza',
  'outro',
]

interface AdjuntoListaViewProps {
  lista: ListaCompras | null
}

export function AdjuntoListaView({ lista: listaInicial }: AdjuntoListaViewProps) {
  const [items, setItems] = useState<ListaComprasItem[]>((listaInicial?.items ?? []) as ListaComprasItem[])
  const supabase = createClient()

  // Realtime sync
  useEffect(() => {
    if (!listaInicial?.id) return
    const channel = supabase
      .channel(`lista-adjunto-${listaInicial.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lista_compras_items',
          filter: `lista_id=eq.${listaInicial.id}`,
        },
        (payload) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? { ...item, ...payload.new } : item
            )
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listaInicial?.id])

  async function toggleComprado(itemId: string, comprado: boolean) {
    const { error } = await supabase
      .from('lista_compras_items')
      .update({ comprado, comprado_em: comprado ? new Date().toISOString() : null })
      .eq('id', itemId)
    if (error) {
      toast.error('Erro ao atualizar')
      return
    }
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, comprado } : item))
    )
  }

  if (!listaInicial || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2 px-4">
        <p className="text-center">Sem lista de compras gerada.<br />A Mamã precisa de gerar a lista primeiro.</p>
      </div>
    )
  }

  const comprados = items.filter((i) => i.comprado).length

  // Group by zone in the predefined order
  const porZona = new Map<string, ListaComprasItem[]>()
  items.forEach((item) => {
    const zona = item.zona_supermercado ?? 'outro'
    if (!porZona.has(zona)) porZona.set(zona, [])
    porZona.get(zona)!.push(item)
  })

  const zonasOrdenadas = ZONA_ORDEM.filter((z) => porZona.has(z))
  const zonasExtras = Array.from(porZona.keys()).filter((z) => !ZONA_ORDEM.includes(z as ZonaSupermercado))

  return (
    <div className="pb-4">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E7E8D1] px-4 py-3">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-gray-600">{comprados} de {items.length} itens</span>
          <span className="text-[#B85042] font-bold">{Math.round((comprados / items.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-[#E7E8D1] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#B85042] rounded-full transition-all duration-300"
            style={{ width: `${(comprados / items.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-0">
        {[...zonasOrdenadas, ...zonasExtras].map((zona) => {
          const zonaItems = porZona.get(zona) ?? []
          const compradosZona = zonaItems.filter((i) => i.comprado).length

          return (
            <div key={zona}>
              {/* Zone header */}
              <div className="sticky top-[76px] z-10 bg-[#B85042] px-4 py-3 flex items-center justify-between">
                <h2 className="font-bold text-white text-base uppercase tracking-wide">
                  {ZONA_LABELS[zona as ZonaSupermercado] ?? zona}
                </h2>
                <Badge className="bg-white text-[#B85042] font-bold">
                  {compradosZona}/{zonaItems.length}
                </Badge>
              </div>

              {/* Items */}
              <div className="bg-white">
                {zonaItems.map((item, i) => (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-center gap-4 px-4 py-4 cursor-pointer active:bg-[#f8f8f4] min-h-[72px]',
                      i < zonaItems.length - 1 && 'border-b border-[#E7E8D1]',
                      item.comprado && 'bg-[#f8f8f4]'
                    )}
                  >
                    <Checkbox
                      checked={item.comprado}
                      onCheckedChange={(checked) => toggleComprado(item.id, checked as boolean)}
                      className={cn(
                        'h-7 w-7 min-h-[44px] min-w-[44px]',
                        item.comprado && 'opacity-50'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-base font-medium text-[#36454F] leading-tight',
                        item.comprado && 'line-through text-gray-400'
                      )}>
                        {item.ingrediente?.nome ?? item.nome_custom ?? '?'}
                      </p>
                      {item.notas && (
                        <p className="text-sm text-gray-400 mt-0.5">{item.notas}</p>
                      )}
                    </div>
                    <p className={cn(
                      'text-base font-bold shrink-0',
                      item.comprado ? 'text-gray-300' : 'text-[#B85042]'
                    )}>
                      {formatQuantidade(item.quantidade, item.unidade)}
                    </p>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
