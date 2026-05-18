import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import NovaDespesaClient from './NovaDespesaClient'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function NovaDespesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: campo } = await supabase.from('campos').select('*').eq('id', id).single()
  if (!campo) notFound()
  return <NovaDespesaClient campo={campo as Campo} />
}
