import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CampoTracker } from '@/components/CampoTracker'

export default async function ReceitasLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createClient()
  const { data: campo } = await supabase.from('campos').select('id, nome').eq('id', id).single()
  if (!campo) notFound()

  return (
    <div className="min-h-screen">
      <CampoTracker campoId={id} campoNome={campo.nome} />
      {children}
    </div>
  )
}
