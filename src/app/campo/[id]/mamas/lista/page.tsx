import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ListaComprasView } from '@/components/mamas/lista/ListaComprasView'
import { Header } from '@/components/mamas/Header'
import type { Campo } from '@/types/shared'
import type { ListaCompras } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function ListaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ gerar_dia?: string; gerar_refeicao?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = createClient()

  const [{ data: campo }, { data: listas }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('lista_compras')
      .select('*, items:lista_compras_items(*, ingrediente:ingredientes(*))')
      .eq('campo_id', id)
      .order('gerada_em', { ascending: false }),
  ])

  if (!campo) notFound()

  const gerarDia = sp.gerar_dia ? parseInt(sp.gerar_dia) : undefined
  const gerarRefeicao = sp.gerar_refeicao ?? undefined

  return (
    <>
      <Header title="Lista de Compras" backHref={`/campo/${id}`} />
      <ListaComprasView
        campo={campo as Campo}
        listas={(listas ?? []) as ListaCompras[]}
        campoId={id}
        gerarDia={gerarDia}
        gerarRefeicao={gerarRefeicao}
      />
    </>
  )
}
