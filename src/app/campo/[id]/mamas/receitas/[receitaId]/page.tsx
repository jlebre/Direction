import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReceitaRedirect({
  params,
}: {
  params: Promise<{ id: string; receitaId: string }>
}) {
  const { id, receitaId } = await params
  redirect(`/campo/${id}/receitas/${receitaId}`)
}
