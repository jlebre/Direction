import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, UtensilsCrossed, BookOpen } from 'lucide-react'
import type { Campo } from '@/types/shared'
import { getNumDias } from '@/types/shared'
import { ExportarPlanoButton } from './ExportarPlanoButton'

export const dynamic = 'force-dynamic'

export default async function MamasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const { data: campo } = await supabase.from('campos').select('*').eq('id', id).single()

  if (!campo) notFound()
  const c = campo as Campo
  const primeiroNome = c.mama?.split(' ')[0] || 'Mamã'

  const numDias = getNumDias(c.seccao)
  const diasList = [-2, -1, ...Array.from({ length: numDias }, (_, i) => i + 1)]

  return (
    <main className="min-h-screen">
      <div className="bg-[#2D5016] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <Link href={`/campo/${id}`} className="text-green-200 text-sm">← {c.nome}</Link>
          <h1 className="text-2xl font-bold mt-2">Olá, {primeiroNome}</h1>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Link
              href={`/campo/${id}/mamas/receitas`}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Receitas
            </Link>
            <Link
              href={`/campo/${id}/mamas/conselhos`}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl px-3 py-2 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Conselhos
            </Link>
            <ExportarPlanoButton campo={c} diasList={diasList} />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <Link href={`/campo/${id}/mamas/ementa`}>
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-center gap-4 active:opacity-80">
            <div className="bg-green-100 rounded-xl p-3">
              <CalendarDays className="h-7 w-7 text-green-700" />
            </div>
            <div>
              <p className="font-bold text-green-700 text-base">Plano de Refeições</p>
              <p className="text-xs text-green-600 opacity-70 mt-0.5">Planear refeições dia a dia</p>
            </div>
          </div>
        </Link>
      </div>
    </main>
  )
}
