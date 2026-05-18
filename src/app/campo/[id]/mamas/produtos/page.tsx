import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProdutosView } from '@/components/mamas/produtos/ProdutosView'
import { Header } from '@/components/mamas/Header'
import type { CampoProduto } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function ProdutosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: produtos }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase.from('campo_produtos').select('*').eq('campo_id', id).order('categoria').order('nome'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Produtos do Campo" backHref={`/campo/${id}/mamas`} />
      <ProdutosView campoId={id} produtosIniciais={(produtos ?? []) as CampoProduto[]} />
    </>
  )
}
