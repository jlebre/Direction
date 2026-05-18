import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CampoNav } from '@/components/mamas/CampoNav'
import { CampoTracker } from '@/components/CampoTracker'

export default async function MamasLayout({
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
    <div className="lg:pl-56">
      <CampoTracker campoId={id} campoNome={campo.nome} />
      <CampoNav campoId={id} campoNome={campo.nome} />
      <div className="pb-16 lg:pb-0 min-h-screen">{children}</div>
    </div>
  )
}
