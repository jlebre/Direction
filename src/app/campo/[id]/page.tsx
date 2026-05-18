import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Settings, UtensilsCrossed, Receipt,
  Users, Pill, ShoppingCart, CalendarDays, AlertTriangle,
} from 'lucide-react'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function CampoHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [
    { data: campo },
    { data: animados },
    { data: despesas },
  ] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('animados').select('id').eq('campo_id', id),
    supabase.from('despesas').select('id, valor, tipo').eq('campo_id', id),
  ])

  if (!campo) redirect('/')
  if (!campo.setup_completo) redirect(`/campo/${id}/setup`)

  const c = campo as Campo

  const totalDespesas = (despesas ?? [])
    .filter((d: { tipo: string }) => d.tipo === 'despesa')
    .reduce((s: number, d: { valor: number }) => s + Number(d.valor), 0)
  const saldoDisponivel = c.saldo_inicial - totalDespesas

  const numAnimados = animados?.length ?? 0
  const ids = (animados ?? []).map((a: { id: string }) => a.id)

  let numMedicacoes = 0
  let numRestricoes = 0
  if (ids.length > 0) {
    const [{ count: mc }, { count: rc }] = await Promise.all([
      supabase.from('farmacia_medicacoes').select('id', { count: 'exact', head: true }).in('animado_id', ids).eq('ativo', true),
      supabase.from('restricoes_alimentares').select('id', { count: 'exact', head: true }).in('animado_id', ids),
    ])
    numMedicacoes = mc ?? 0
    numRestricoes = rc ?? 0
  }

  const modulos = [
    {
      href: `/campo/${id}/mamas`,
      label: 'Módulo Mamãs',
      sublabel: 'Ementa, receitas, compras, farmácia',
      icon: UtensilsCrossed,
      cor: '#2D5016',
      bg: '#2D5016',
    },
    {
      href: `/campo/${id}/adjuntos`,
      label: 'Módulo Adjuntos',
      sublabel: `Despesas · €${saldoDisponivel.toFixed(0)} disponível`,
      icon: Receipt,
      cor: '#B85042',
      bg: '#B85042',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E7E8D1] px-4 h-14 flex items-center gap-3">
        <Link href="/" className="text-[#2D5016] hover:opacity-70 transition-opacity">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-[#36454F] flex-1 truncate">{c.nome}</h1>
        <Link
          href={`/campo/${id}/setup`}
          className="p-2 rounded-lg hover:bg-[#E7E8D1] transition-colors"
        >
          <Settings className="h-4 w-4 text-[#36454F]" />
        </Link>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-8">
        {/* Info card */}
        <div className="bg-[#2D5016] text-white rounded-2xl p-4 space-y-2">
          <p className="font-bold text-lg">{c.nome}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/80">
            {c.datas && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.datas}</span>
              </div>
            )}
            {c.local && (
              <div className="flex items-center gap-1.5">
                <span className="truncate">📍 {c.local}</span>
              </div>
            )}
            {c.mama && (
              <span className="truncate">Mamã: {c.mama}</span>
            )}
            {c.diretor && (
              <span className="truncate">Dir.: {c.diretor}</span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Link href={`/campo/${id}/mamas/animados`} className="bg-white rounded-xl border border-[#E7E8D1] p-3 text-center hover:border-[#2D5016]/30 transition-colors">
            <p className="text-xl font-bold text-[#2D5016]">{numAnimados}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Users className="h-3 w-3 text-gray-400" />
              <p className="text-[10px] text-gray-500 leading-tight">animados</p>
            </div>
          </Link>
          <Link href={`/campo/${id}/mamas/farmacia`} className="bg-white rounded-xl border border-[#E7E8D1] p-3 text-center hover:border-[#36454F]/30 transition-colors">
            <p className="text-xl font-bold text-[#36454F]">{numMedicacoes}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Pill className="h-3 w-3 text-gray-400" />
              <p className="text-[10px] text-gray-500 leading-tight">medicações</p>
            </div>
          </Link>
          <Link href={`/campo/${id}/mamas/animados`} className="bg-white rounded-xl border border-[#E7E8D1] p-3 text-center hover:border-red-300 transition-colors">
            <p className="text-xl font-bold text-red-500">{numRestricoes}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <AlertTriangle className="h-3 w-3 text-gray-400" />
              <p className="text-[10px] text-gray-500 leading-tight">restrições</p>
            </div>
          </Link>
        </div>

        {/* Módulos principais */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Módulos</h2>
          <div className="space-y-3">
            {modulos.map((m) => {
              const Icon = m.icon
              return (
                <Link key={m.href} href={m.href} className="block">
                  <div
                    className="rounded-2xl p-5 text-white flex items-center gap-4 active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: m.bg }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-tight">{m.label}</p>
                      <p className="text-sm text-white/80 mt-0.5">{m.sublabel}</p>
                    </div>
                    <div className="ml-auto text-white/60">›</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Acesso rápido animados */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Acesso rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: `/campo/${id}/mamas/animados`, label: 'Animados', icon: Users, cor: '#2D5016' },
              { href: `/campo/${id}/mamas/lista`, label: 'Lista de Compras', icon: ShoppingCart, cor: '#B85042' },
              { href: `/campo/${id}/mamas/farmacia`, label: 'Farmácia', icon: Pill, cor: '#36454F' },
              { href: `/campo/${id}/mamas/ementa`, label: 'Ementa', icon: CalendarDays, cor: '#F5A623' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 flex items-center gap-3 hover:border-[#2D5016]/30 transition-colors active:scale-[0.98]">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.cor}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.cor }} />
                    </div>
                    <span className="font-semibold text-sm text-[#36454F]">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
