import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif } from '@/types/adjuntos'
import DespesaItem from '@/components/adjuntos/DespesaItem'
import BudgetBar from '@/components/adjuntos/BudgetBar'
import BolsaNIF from '@/components/adjuntos/BolsaNIF'
import ExportButton from './ExportButton'

export const dynamic = 'force-dynamic'

export default async function AdjuntosDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesas }, { data: regularizacoes }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('despesas').select('*').eq('campo_id', id).order('numero_recibo', { ascending: false }),
    supabase.from('regularizacoes_nif').select('*').eq('campo_id', id),
  ])

  if (!campo) notFound()
  if (!campo.setup_completo) redirect(`/campo/${id}/setup`)

  const c = campo as Campo
  const ds = (despesas ?? []) as Despesa[]
  const regs = (regularizacoes ?? []) as RegularizacaoNif[]

  // Faturas de regularização não contam para o saldo (são documentos NIF, não novos custos)
  const dsFinanceiras = ds.filter((d) => !d.is_regularizacao_nif)

  const totalDespesas = dsFinanceiras.filter((d) => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor), 0)
  const totalReceitas = dsFinanceiras.filter((d) => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor), 0)
  const saldoDisponivel = c.saldo_inicial + totalReceitas - totalDespesas
  const pctGasto = c.saldo_inicial > 0 ? Math.min((totalDespesas / c.saldo_inicial) * 100, 100) : 0

  const porCodigo: Record<string, number> = {}
  for (const d of dsFinanceiras.filter((d) => d.tipo === 'despesa')) {
    porCodigo[d.codigo] = (porCodigo[d.codigo] ?? 0) + Number(d.valor)
  }

  // Faturas sem NIF: despesas originais (não regularizações) sem nif_confirmado
  const faturasSemNIF = ds.filter(
    (d) => d.tipo === 'despesa' && !d.nif_confirmado && !d.is_regularizacao_nif
  )

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
          <h1 className="text-2xl font-bold">Olá, {c.adjunto?.split(' ')[0] || 'Adjunto'}</h1>
          <Link
            href={`/campo/${id}/adjuntos/faturas`}
            className="inline-flex items-center gap-2 mt-2 text-red-200 text-sm hover:text-white transition-colors"
          >
            <span>Ver todas as faturas</span>
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-semibold">{ds.length}</span>
            <span className="opacity-60">→</span>
          </Link>

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
        {/* Orçamento por categoria */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Orçamento por Categoria
          </h2>
          <BudgetBar escalao={c.escalao} porCodigo={porCodigo} />
        </section>

        {/* Bolsa NIF */}
        {faturasSemNIF.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Bolsa NIF
            </h2>
            <BolsaNIF campo={c} faturasSemNIF={faturasSemNIF} regularizacoes={regs} />
          </section>
        )}

        {/* Lista de despesas recentes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Recentes
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

        {/* Link admin storage */}
        <div className="text-center pb-2">
          <Link href={`/campo/${id}/adjuntos/storage`} className="text-xs text-gray-300">
            área técnica · storage
          </Link>
        </div>
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
