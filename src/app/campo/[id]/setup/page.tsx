import { createSessionServerClient } from '@/lib/supabase/session-server'
import { notFound } from 'next/navigation'
import SetupForm from './SetupForm'
import type { CampoPublico } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSessionServerClient()
  const { data: campo } = await supabase.from('campos').select('*').eq('id', id).single()
  if (!campo) notFound()
  const { pin, ...campoPublico } = campo
  return <SetupForm campo={campoPublico as CampoPublico} hasPin={!!pin} />
}
