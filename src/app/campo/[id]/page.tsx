import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Settings, UtensilsCrossed, Receipt,
  Pill, ShoppingCart, DollarSign, AlertTriangle,
  CalendarDays, MapPin,
} from 'lucide-react'
import { ESCALAO_COR } from '@/types/shared'
import { CampoTracker } from '@/components/CampoTracker'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function CampoHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesas }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('despesas').select('id, valor, tipo, is_regularizacao_nif').eq('campo_id', id),
  ])

  if (!campo) redirect('/')
  if (!campo.setup_completo) redirect(`/campo/${id}/setup`)

  const c = campo as Campo

  const totalDespesas = (despesas ?? [])
    .filter((d: { tipo: string; is_regularizacao_nif?: boolean }) => d.tipo === 'despesa' && !d.is_regularizacao_nif)
    .reduce((s: number, d: { valor: number }) => s + Number(d.valor), 0)
  const totalReceitas = (despesas ?? [])
    .filter((d: { tipo: string }) => d.tipo === 'receita')
    .reduce((s: number, d: { valor: number }) => s + Number(d.valor), 0)
  const saldoDisponivel = c.saldo_inicial + totalReceitas - totalDespesas

  const cor = ESCALAO_COR[c.escalao]

  const ferramentasCampo = [
    { href: `/campo/${id}/mamas/farmacia`,  label: 'Farmácia',              icon: Pill,          cor: '#36454F' },
    { href: `/campo/${id}/mamas/lista`,     label: 'Lista de Compras',      icon: ShoppingCart,  cor: '#F5A623' },
    { href: `/campo/${id}/mamas/precos`,    label: 'Preços',                icon: DollarSign,    cor: '#2D5016' },
    { href: `/campo/${id}/mamas/restricoes`, label: 'Restrições Alimentares', icon: AlertTriangle, cor: '#D97706' },
  ]

  return (
    <div className="min-h-screen">
      <CampoTracker campoId={id} campoNome={c.nome} />

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E7E8D1] px-4 h-14 flex items-center gap-3">
        <Link href="/" className="text-[#2D5016] hover:opacity-70 transition-opacity">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-[#36454F] flex-1 truncate">{c.nome}</h1>
        <Link
          href={`/campo/${id}/setup`}
          className="p-2 rounded-lg hover:bg-[#E7E8D1] transition-colors"
          title="Definições"
        >
          <Settings className="h-4 w-4 text-[#36454F]" />
        </Link>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-8">
        {/* Banner do campo */}
        <div
          className="text-white rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: cor?.bg ?? '#2D5016' }}
        >
          <div>
            <h2 className="font-bold text-xl leading-tight">{c.nome}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {c.escalao && (
                <span className="text-xs font-semibold bg-white/20 rounded-full px-2 py-0.5">
                  {c.escalao}
                </span>
              )}
              {c.ano && c.periodo && (
                <span className="text-xs text-white/70">
                  Período {c.periodo} · {c.ano}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/80">
            {c.datas && (
              <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>{c.datas}</span>
              </div>
            )}
            {c.local && (
              <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{c.local}</span>
              </div>
            )}
          </div>

          <div className="border-t border-white/20 pt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Diretor/a', value: c.diretor },
              { label: 'Adjunto/a', value: c.adjunto },
              { label: 'Mamã', value: c.mama },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-white/50 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-white truncate">{value || 'por definir'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Módulos — compactos */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Módulos</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/campo/${id}/mamas`} className="block">
              <div className="bg-[#2D5016] text-white rounded-xl px-4 py-4 flex items-center gap-3 active:scale-[0.97] transition-transform">
                <UtensilsCrossed className="h-5 w-5 shrink-0" />
                <span className="font-bold text-base">Mamã</span>
              </div>
            </Link>
            <Link href={`/campo/${id}/adjuntos`} className="block">
              <div className="bg-[#B85042] text-white rounded-xl px-4 py-4 flex items-center gap-3 active:scale-[0.97] transition-transform">
                <Receipt className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold text-base leading-tight">Adjunto</p>
                  <p className="text-xs text-white/70">€{saldoDisponivel.toFixed(0)}</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Ferramentas do campo */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Campo</h2>
          <div className="grid grid-cols-2 gap-3">
            {ferramentasCampo.map((item) => {
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
