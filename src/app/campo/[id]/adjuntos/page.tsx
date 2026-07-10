import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Campo } from '@/types/shared'
import { ESCALAO_COR } from '@/types/shared'
import type { Despesa, RegularizacaoNif, Devolucao } from '@/types/adjuntos'
import DespesaItem from '@/components/adjuntos/DespesaItem'
import BudgetBar from '@/components/adjuntos/BudgetBar'
import BolsaNIF from '@/components/adjuntos/BolsaNIF'
import ExportButton from './ExportButton'

export const dynamic = 'force-dynamic'

export default async function AdjuntosDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesas }, { data: regularizacoes }, { data: devolucoes }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('despesas')
      .select('id, campo_id, numero_recibo, data, valor, descricao, codigo, codigo_descricao, tipo, nif_confirmado, foto_path, is_regularizacao_nif, created_at')
      .eq('campo_id', id)
      .order('numero_recibo', { ascending: false }),
    supabase
      .from('regularizacoes_nif')
      .select('id, campo_id, despesa_original_id, despesa_regularizacao_id, valor, created_at')
      .eq('campo_id', id),
    supabase
      .from('devolucoes')
      .select('id, campo_id, numero_devolucao, data, valor, descricao, codigo, codigo_descricao')
      .eq('campo_id', id)
      .order('numero_devolucao', { ascending: false }),
  ])

  if (!campo) notFound()
  if (!campo.setup_completo) redirect(`/campo/${id}/setup`)

  const c = campo as Campo
  const cor = ESCALAO_COR[c.escalao] ?? { bg: '#B85042', text: '#5c1f15', light: '#FDECEA', border: '#F4A090' }
  const ds = (despesas ?? []) as Despesa[]
  const regs = (regularizacoes ?? []) as RegularizacaoNif[]
  const devs = (devolucoes ?? []) as Devolucao[]

  // Faturas de regularização não contam para o saldo (são documentos NIF, não novos custos)
  const dsFinanceiras = ds.filter((d) => !d.is_regularizacao_nif)

  const totalDespesas = dsFinanceiras.filter((d) => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor), 0)
  const totalReceitas = dsFinanceiras.filter((d) => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor), 0)
  const totalDevolucoes = devs.reduce((s, d) => s + Number(d.valor), 0)
  // Devoluções abatidas às despesas para saldo líquido
  const saldoDisponivel = c.saldo_inicial + totalReceitas - totalDespesas + totalDevolucoes
  const orcamentoTotal = c.saldo_inicial + totalReceitas
  const gastoLiquido = totalDespesas - totalDevolucoes
  const pctGasto = orcamentoTotal > 0 ? Math.min((gastoLiquido / orcamentoTotal) * 100, 100) : 0

  const porCodigo: Record<string, number> = {}
  for (const d of dsFinanceiras.filter((d) => d.tipo === 'despesa')) {
    porCodigo[d.codigo] = (porCodigo[d.codigo] ?? 0) + Number(d.valor)
  }
  // Abater devoluções com código ao gasto por categoria (gasto líquido)
  for (const d of devs) {
    if (d.codigo) {
      porCodigo[d.codigo] = Math.max(0, (porCodigo[d.codigo] ?? 0) - Number(d.valor))
    }
  }

  // Faturas sem NIF: despesas originais (não regularizações) sem nif_confirmado
  const faturasSemNIF = ds.filter(
    (d) => d.tipo === 'despesa' && !d.nif_confirmado && !d.is_regularizacao_nif
  )

  return (
    <main className="min-h-screen pb-28">
      {/* Header — cor do escalão */}
      <div className="text-white px-4 pt-10 pb-6" style={{ backgroundColor: cor.bg }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/campo/${id}`} className="text-sm flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              ← {c.nome}
            </Link>
            <ExportButton campo={c} />
          </div>
          <h1 className="text-2xl font-bold">Olá, {c.adjunto?.split(' ')[0] || 'Adjunto'}</h1>
          <Link
            href={`/campo/${id}/adjuntos/faturas`}
            className="inline-flex items-center gap-2 mt-2 text-sm hover:text-white transition-colors"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <span>Ver todas as faturas</span>
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-semibold">{ds.length}</span>
            <span className="opacity-60">→</span>
          </Link>

          <div className="mt-5">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Saldo disponível</p>
            <p className={`text-4xl font-bold mt-1 ${saldoDisponivel < 0 ? 'text-red-300' : 'text-white'}`}>
              €{saldoDisponivel.toFixed(2)}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <span>€{totalDespesas.toFixed(2)} gasto</span>
              <span>de €{c.saldo_inicial.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 w-full rounded-full h-2" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${pctGasto}%`,
                backgroundColor: pctGasto > 90 ? '#fca5a5' : pctGasto > 70 ? '#fde68a' : 'rgba(255,255,255,0.7)',
              }}
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

        {/* Devoluções */}
        {devs.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Devoluções / Notas de crédito
            </h2>
            <div className="space-y-2">
              {devs.map((d) => (
                <Link
                  key={d.id}
                  href={`/campo/${id}/adjuntos/devolucao/${d.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-green-100 px-4 py-3 hover:shadow-sm active:scale-[0.99] transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      #{d.numero_devolucao} — {d.descricao ?? d.codigo_descricao ?? 'Devolução'}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-green-600 font-bold text-sm">+€{Number(d.valor).toFixed(2)}</span>
                    <span className="text-gray-300 text-xs">›</span>
                  </div>
                </Link>
              ))}
            </div>
            {totalDevolucoes > 0 && (
              <p className="text-xs text-green-600 font-medium mt-2 text-right">
                Total devoluções: +€{totalDevolucoes.toFixed(2)}
              </p>
            )}
          </section>
        )}

        {/* Link admin storage */}
        <div className="text-center pb-2">
          <Link href={`/campo/${id}/adjuntos/storage`} className="text-xs text-gray-300">
            área técnica · storage
          </Link>
        </div>
      </div>

      {/* FABs */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3">
        <Link
          href={`/campo/${id}/adjuntos/nova-devolucao`}
          className="flex items-center gap-2 text-white px-4 py-3 rounded-xl shadow-lg font-medium text-sm active:scale-95 transition-transform bg-green-600 hover:bg-green-700"
        >
          <span className="text-base font-light">+</span>
          Nova Devolução
        </Link>
        <Link
          href={`/campo/${id}/adjuntos/nova-despesa`}
          className="flex items-center gap-2 text-white px-5 py-4 rounded-2xl shadow-2xl font-semibold text-base active:scale-95 transition-transform"
          style={{ backgroundColor: cor.bg }}
        >
          <span className="text-xl font-light">+</span>
          Nova Despesa
        </Link>
      </div>
    </main>
  )
}
