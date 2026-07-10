import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrecosComunitariosView } from '@/components/mamas/precos/PrecosComunitariosView'
import { Header } from '@/components/mamas/Header'

export const dynamic = 'force-dynamic'

export default async function PrecosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: precosData }, { data: supermercadosData }] = await Promise.all([
    supabase.from('campos').select('id, nome').eq('id', id).single(),
    supabase.from('precos').select('*, supermercado:supermercados(*)').is('deleted_at', null).order('produto'),
    supabase.from('supermercados').select('*').order('nome'),
  ])

  if (!campo) notFound()

  return (
    <>
      <Header title="Preços" backHref={`/campo/${id}/mamas`} />
      <PrecosComunitariosView
        precosIniciais={(precosData ?? []) as Parameters<typeof PrecosComunitariosView>[0]['precosIniciais']}
        supermercadosIniciais={(supermercadosData ?? []) as Parameters<typeof PrecosComunitariosView>[0]['supermercadosIniciais']}
      />
    </>
  )
}
