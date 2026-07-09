import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import NovaDespesaClient from './NovaDespesaClient'
import type { CampoPublico } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function NovaDespesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: campo } = await supabase.from('campos').select('*').eq('id', id).single()
  if (!campo) notFound()
  const { pin, ...campoPublico } = campo
  return <NovaDespesaClient campo={campoPublico as CampoPublico} hasPin={!!pin} />
}
