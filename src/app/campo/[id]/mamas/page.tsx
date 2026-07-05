import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, AlertTriangle, Users, UtensilsCrossed, BookOpen } from 'lucide-react'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function MamasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { count: animadosCount }, { count: restricoesCount }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('animados').select('*', { count: 'exact', head: true }).eq('campo_id', id),
    supabase.from('restricoes_alimentares').select('*', { count: 'exact', head: true }).eq('animados.campo_id', id),
  ])

  if (!campo) notFound()
  const c = campo as Campo

  const modulos = [
    { href: 'ementa',    label: 'Ementa',      icon: CalendarDays,   desc: 'Planear refeições dia a dia',              color: 'text-green-700 bg-green-50 border-green-200' },
    { href: 'animados',  label: 'Animados',    icon: Users,          desc: `${animadosCount ?? 0} animados registados`, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { href: 'receitas',  label: 'Receitas',    icon: UtensilsCrossed, desc: 'Livrinho da Mamã',                        color: 'text-[#B85042] bg-red-50 border-red-200' },
    { href: 'restricoes', label: 'Restrições', icon: AlertTriangle,  desc: `${restricoesCount ?? 0} restrições`,       color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    { href: 'conselhos', label: 'Conselhos',   icon: BookOpen,       desc: 'Guia das mamãs CAMTIL',                   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  ]

  return (
    <main className="min-h-screen">
      <div className="bg-[#2D5016] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <Link href={`/campo/${id}`} className="text-green-200 text-sm">← {c.nome}</Link>
          <h1 className="text-2xl font-bold mt-2">Módulo Mamãs</h1>
          <p className="text-green-200 text-sm mt-1">Alimentação, compras e saúde</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {modulos.map((m) => (
            <Link key={m.href} href={`/campo/${id}/mamas/${m.href}`}>
              <div className={`rounded-xl border p-4 space-y-2 active:opacity-80 ${m.color}`}>
                <m.icon className="h-6 w-6" />
                <p className="font-bold text-sm">{m.label}</p>
                <p className="text-xs opacity-70">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
