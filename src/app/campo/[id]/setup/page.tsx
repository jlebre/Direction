import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SetupForm from './SetupForm'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: campo } = await supabase.from('campos').select('*').eq('id', id).single()
  if (!campo) notFound()
  return <SetupForm campo={campo as Campo} />
}
