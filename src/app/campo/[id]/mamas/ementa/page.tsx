import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EmentaCalendario } from '@/components/mamas/ementa/EmentaCalendario'
import type { Campo } from '@/types/shared'
import type { EmentaItem, RestricaoAlimentar, Animado } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function EmentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: ementa }, { data: receitas }, { data: animados }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('ementa').select('*, receita:receitas(id, nome, categoria, tags)').eq('campo_id', id),
    supabase.from('receitas').select('id, nome, categoria, tags, is_oficial').order('nome'),
    supabase.from('animados').select('id, nome, restricoes:restricoes_alimentares(*, animado:animados(id, nome))').eq('campo_id', id),
  ])

  if (!campo) notFound()

  const restricoes: RestricaoAlimentar[] = (animados ?? []).flatMap(
    (a: { restricoes?: RestricaoAlimentar[] }) => a.restricoes ?? []
  )

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <EmentaCalendario
        campo={campo as Campo}
        ementaInicial={(ementa ?? []) as EmentaItem[]}
        receitas={receitas ?? []}
        restricoes={restricoes}
      />
    </div>
  )
}
