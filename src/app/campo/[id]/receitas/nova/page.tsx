import NovaReceitaClient from '@/components/mamas/receitas/NovaReceitaClient'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <NovaReceitaClient campoId={id} />
}
