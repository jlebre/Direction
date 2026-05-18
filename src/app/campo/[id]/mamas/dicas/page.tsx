import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/mamas/Header'
import DicasClient from './DicasClient'

export const dynamic = 'force-dynamic'

export default async function DicasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: dicas }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase.from('campo_dicas').select('*').eq('campo_id', id).order('created_at', { ascending: false }),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Dicas" backHref={`/campo/${id}/mamas`} />
      <DicasClient campoId={id} dicasIniciais={dicas ?? []} />
    </>
  )
}
