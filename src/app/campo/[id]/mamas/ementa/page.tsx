import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EmentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/campo/${id}/mamas`)
}
