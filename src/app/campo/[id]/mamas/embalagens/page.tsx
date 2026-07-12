import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/mamas/Header'
import { EmbalagensConfigView } from '@/components/mamas/embalagens/EmbalagensConfigView'
import type { IngredienteEmbalagem } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function EmbalagensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: ingredientes }, { data: embalagens }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase.from('ingredientes').select('id, nome').order('nome'),
    supabase
      .from('ingrediente_embalagens')
      .select('*, ingrediente:ingredientes(id, nome)')
      .order('ingrediente_id'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Embalagens e Conversões" backHref={`/campo/${id}/mamas/lista`} />
      <EmbalagensConfigView
        ingredientes={(ingredientes ?? []) as { id: string; nome: string }[]}
        embalagensIniciais={(embalagens ?? []) as IngredienteEmbalagem[]}
      />
    </>
  )
}
