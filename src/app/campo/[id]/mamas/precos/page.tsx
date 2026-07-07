import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrecosView } from '@/components/mamas/precos/PrecosView'
import { Header } from '@/components/mamas/Header'
import type { CampoPreco } from '@/types/mamas'

export const dynamic = 'force-dynamic'

export default async function PrecosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: precos }, { data: precosRef }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase.from('campo_precos').select('*, campo:campos(nome)').order('categoria').order('item'),
    supabase.from('campo_precos').select('*, campo:campos(nome)').is('campo_id', null).order('categoria').order('item'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Preços" backHref={`/campo/${id}`} />
      <PrecosView
        campoId={id}
        precosIniciais={(precos ?? []) as CampoPreco[]}
        precosReferencia={(precosRef ?? []) as CampoPreco[]}
      />
    </>
  )
}
