import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AdjuntoListaView } from '@/components/mamas/lista/AdjuntoListaView'
import type { ListaCompras } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function AdjuntoListaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: lista }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase
      .from('lista_compras')
      .select('*, items:lista_compras_items(*, ingrediente:ingredientes(nome))')
      .eq('campo_id', id)
      .eq('tipo', 'despensa')
      .order('gerada_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!campo) notFound()

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal header — no nav sidebar for this shared view */}
      <div className="sticky top-0 z-20 bg-[#B85042] text-white px-4 h-14 flex items-center gap-3">
        <Link href={`/campo/${id}/mamas/lista`} className="text-red-200 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="font-bold text-sm leading-tight">{campo.nome}</p>
          <p className="text-red-200 text-xs">Lista de compras</p>
        </div>
      </div>
      <AdjuntoListaView lista={lista as ListaCompras | null} />
    </div>
  )
}
