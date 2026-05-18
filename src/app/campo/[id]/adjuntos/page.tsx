import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Campo } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import DespesaItem from '@/components/adjuntos/DespesaItem'
import BudgetBar from '@/components/adjuntos/BudgetBar'
import ExportButton from './ExportButton'

export const dynamic = 'force-dynamic'

export default async function AdjuntosDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesas }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('despesas').select('*').eq('campo_id', id).order('numero_recibo', { ascending: false }),
  ])

  if (!campo) notFound()
  if (!campo.setup_completo) redirect(`/campo/${id}/setup`)

  const c = campo as Campo
  const ds = (despesas ?? []) as Despesa[]

  const totalDespesas = ds.filter((d) => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor), 0)
  const totalReceitas = ds.filter((d) => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor), 0)
  const saldoDisponivel = c.saldo_inicial + totalReceitas - totalDespesas
  const pctGasto = c.saldo_inicial > 0 ? Math.min((totalDespesas / c.saldo_inicial) * 100, 100) : 0

  const porCodigo: Record<string, number> = {}
  for (const d of ds.filter((d) => d.tipo === 'despesa')) {
    porCodigo[d.codigo] = (porCodigo[d.codigo] ?? 0) + Number(d.valor)
  }

  return (
    <main className="min-h-screen pb-28">
      {/* Header */}
      <div className="bg-[#B85042] text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/campo/${id}`} className="text-red-200 text-sm flex items-center gap-1">
              ← {c.nome}
            </Link>
            <ExportButton campo={c} />
          </div>
          <h1 className="text-2xl font-bold">Adjuntos</h1>
          <p className="text-red-200 text-sm mt-0.5">{c.escalao} · {c.datas}</p>

          <div className="mt-5">
            <p className="text-red-200 text-sm">Saldo disponível</p>
            <p className={`text-4xl font-bold mt-1 ${saldoDisponivel < 0 ? 'text-red-300' : 'text-white'}`}>
              €{saldoDisponivel.toFixed(2)}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-red-200">
              <span>€{totalDespesas.toFixed(2)} gasto</span>
              <span>de €{c.saldo_inicial.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 w-full bg-red-900/50 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                pctGasto > 90 ? 'bg-red-300' : pctGasto > 70 ? 'bg-yellow-300' : 'bg-red-200'
              }`}
              style={{ width: `${pctGasto}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Equipa */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="flex items-center gap-6 text-sm">
            {[['Diretor/a', c.diretor], ['Adjunto/a', c.adjunto], ['Mamã', c.mama]].map(([role, name]) => (
              <div key={role} className="min-w-0">
                <p className="text-xs text-gray-400">{role}</p>
                <p className="font-medium text-gray-800 truncate">{name || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Orçamento por categoria */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Orçamento por Categoria
          </h2>
          <BudgetBar escalao={c.escalao} porCodigo={porCodigo} />
        </section>

        {/* Lista de despesas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Despesas ({ds.length})
            </h2>
          </div>

          {ds.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-3xl mb-2">🧾</p>
              <p className="text-sm text-gray-400">Ainda sem despesas registadas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ds.map((d) => <DespesaItem key={d.id} despesa={d} campoId={id} />)}
            </div>
          )}
        </section>
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-4 z-40">
        <Link
          href={`/campo/${id}/adjuntos/nova-despesa`}
          className="flex items-center gap-2 bg-[#B85042] text-white px-5 py-4 rounded-2xl shadow-2xl font-semibold text-base active:scale-95 transition-transform"
        >
          <span className="text-xl font-light">+</span>
          Nova Despesa
        </Link>
      </div>
    </main>
  )
}
