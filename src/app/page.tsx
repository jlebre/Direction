import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays, MapPin, Clock, CheckCircle } from 'lucide-react'
import { ContinueBanner } from '@/components/ContinueBanner'
import { ESCALAO_COR } from '@/types/shared'
import type { Campo } from '@/types/shared'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: campos } = await supabase
    .from('campos')
    .select('*')
    .order('ano', { ascending: false })
    .order('periodo', { ascending: true })
    .order('nome', { ascending: true })

  const semCampos = !campos || campos.length === 0
  const allCampos = (campos ?? []) as Campo[]

  // Ano ativo = ano mais recente nos dados
  const anoAtivo = allCampos.reduce((max, c) => Math.max(max, c.ano ?? 2026), 2026)

  // Agrupar por ano e depois por período
  const porAno: Record<number, Record<number, Campo[]>> = {}
  for (const c of allCampos) {
    const ano = c.ano ?? 2026
    const periodo = c.periodo ?? 0
    if (!porAno[ano]) porAno[ano] = {}
    if (!porAno[ano][periodo]) porAno[ano][periodo] = []
    porAno[ano][periodo].push(c)
  }
  const anosOrdenados = Object.keys(porAno).map(Number).sort((a, b) => b - a)

  return (
    <main className="min-h-screen">
      <div className="bg-[#2D5016] text-white px-4 pt-8 pb-4 text-center">
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo.png"
            alt="DIREÇÃO CAMTIL"
            width={120}
            height={120}
            priority
            className="h-24 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Direção CAMTIL</h1>
        <p className="text-white/80 mt-1 text-sm">Escolhe o teu campo para começar.</p>
        <p className="text-white/50 text-xs mt-3 mb-4">CAMTIL · Verão {anoAtivo}</p>
        <ContinueBanner />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-8 pb-12">
        {semCampos ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⛺</div>
            <p className="text-gray-600 font-semibold">Nenhum campo encontrado.</p>
            <p className="text-gray-400 text-sm mt-1">
              Corre o ficheiro{' '}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">supabase/seed.sql</code>{' '}
              no Supabase SQL Editor.
            </p>
          </div>
        ) : (
          anosOrdenados.map((ano) => {
            const periodos = porAno[ano]
            const periodosOrdenados = Object.keys(periodos).map(Number).sort((a, b) => a - b)

            return (
              <div key={ano}>
                {anosOrdenados.length > 1 && (
                  <h2 className="text-xs font-bold text-[#2D5016] uppercase tracking-widest mb-4 px-1">
                    Verão {ano}
                  </h2>
                )}
                <div className="space-y-8">
                  {periodosOrdenados.map((numPeriodo) => {
                    const camposDoPeriodo = periodos[numPeriodo]
                    if (!camposDoPeriodo || camposDoPeriodo.length === 0) return null

                    // Label do período: usar as datas do primeiro campo como referência
                    const primeirosDatas = camposDoPeriodo[0].datas
                    const periodoLabel = numPeriodo > 0
                      ? `Período ${numPeriodo}${primeirosDatas ? ` — ${primeirosDatas}` : ''}`
                      : 'Sem período'

                    return (
                      <div key={numPeriodo}>
                        <h2 className="text-xs font-bold text-[#2D5016] uppercase tracking-widest mb-3 px-1">
                          {periodoLabel}
                        </h2>
                        <div className="space-y-3">
                          {camposDoPeriodo.map((campo) => {
                            const cor = ESCALAO_COR[campo.escalao]
                            const destino = campo.setup_completo
                              ? `/campo/${campo.id}`
                              : `/campo/${campo.id}/setup`
                            return (
                              <Link key={campo.id} href={destino} className="block">
                                <div
                                  className="bg-white rounded-2xl border-l-4 border border-[#E7E8D1] p-4 hover:shadow-md transition-all active:scale-[0.99]"
                                  style={cor ? { borderLeftColor: cor.bg } : undefined}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-[#36454F] text-lg leading-tight">
                                          {campo.nome}
                                        </h3>
                                        {campo.escalao && cor && (
                                          <span
                                            className="text-xs rounded-full px-2 py-0.5 shrink-0 font-semibold border"
                                            style={{ backgroundColor: cor.light, color: cor.text, borderColor: cor.border }}
                                          >
                                            {campo.escalao}
                                          </span>
                                        )}
                                        {campo.escalao && !cor && (
                                          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">
                                            {campo.escalao}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-2 space-y-1">
                                        {campo.datas && (
                                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <CalendarDays className="h-3.5 w-3.5 shrink-0" style={cor ? { color: cor.bg } : undefined} />
                                            <span>{campo.datas}</span>
                                          </div>
                                        )}
                                        {campo.pre_campo && (
                                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            <span>Pré-campo: {campo.pre_campo}</span>
                                          </div>
                                        )}
                                        {campo.local && (
                                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" style={cor ? { color: cor.bg } : undefined} />
                                            <span>{campo.local}</span>
                                          </div>
                                        )}
                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                          <span className="text-xs text-gray-500">
                                            Dir.: <span className="font-medium text-gray-700">{campo.diretor || 'por definir'}</span>
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            Adj.: <span className="font-medium text-gray-700">{campo.adjunto || 'por definir'}</span>
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            Mamã: <span className="font-medium text-gray-700">{campo.mama || 'por definir'}</span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      {campo.setup_completo ? (
                                        <div
                                          className="flex items-center gap-1 rounded-full px-2 py-1"
                                          style={cor
                                            ? { backgroundColor: cor.light, color: cor.text }
                                            : { backgroundColor: '#2D5016/10', color: '#2D5016' }
                                          }
                                        >
                                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                          <span className="text-xs font-semibold whitespace-nowrap">Configurado</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                                          <Clock className="h-3.5 w-3.5 shrink-0" />
                                          <span className="text-xs font-semibold whitespace-nowrap">Por configurar</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
