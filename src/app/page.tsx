import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays, MapPin, Clock, CheckCircle } from 'lucide-react'
import { PERIODOS } from '@/lib/campos-seed'
import type { Campo } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: campos } = await supabase
    .from('campos')
    .select('*')
    .order('periodo', { ascending: true })
    .order('nome', { ascending: true })

  const campoByNome: Record<string, Campo> = {}
  for (const c of (campos ?? []) as Campo[]) campoByNome[c.nome] = c

  const semCampos = !campos || campos.length === 0

  return (
    <main className="min-h-screen">
      <div className="bg-[#2D5016] text-white px-4 py-8 text-center">
        <div className="text-5xl mb-3">⛺</div>
        <h1 className="text-3xl font-bold tracking-tight">App Direção</h1>
        <p className="text-white/80 mt-1 text-sm">Escolhe o teu campo para começar.</p>
        <p className="text-white/50 text-xs mt-1">CAMTIL · Verão 2026</p>
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
          PERIODOS.map((periodo) => {
            const camposDoPeriodo = periodo.campos
              .map((nome) => campoByNome[nome])
              .filter(Boolean) as Campo[]

            if (camposDoPeriodo.length === 0) return null

            return (
              <div key={periodo.numero}>
                <h2 className="text-xs font-bold text-[#2D5016] uppercase tracking-widest mb-3 px-1">
                  {periodo.label}
                </h2>
                <div className="space-y-3">
                  {camposDoPeriodo.map((campo) => {
                    const destino = campo.setup_completo
                      ? `/campo/${campo.id}`
                      : `/campo/${campo.id}/setup`
                    return (
                      <Link key={campo.id} href={destino} className="block">
                        <div className="bg-white rounded-2xl border border-[#E7E8D1] p-4 hover:shadow-md hover:border-[#2D5016]/30 transition-all active:scale-[0.99]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-[#36454F] text-lg leading-tight">
                                  {campo.nome}
                                </h3>
                                {campo.escalao && (
                                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">
                                    {campo.escalao}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 space-y-1">
                                {campo.datas && (
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <CalendarDays className="h-3.5 w-3.5 text-[#2D5016] shrink-0" />
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
                                    <MapPin className="h-3.5 w-3.5 text-[#2D5016] shrink-0" />
                                    <span>{campo.local}</span>
                                  </div>
                                )}
                                {(campo.mama || campo.diretor) && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {campo.mama && (
                                      <span className="text-xs bg-[#F7F3E8] text-[#36454F] rounded-full px-2 py-0.5">
                                        Mamã: {campo.mama}
                                      </span>
                                    )}
                                    {campo.diretor && (
                                      <span className="text-xs bg-[#F7F3E8] text-[#36454F] rounded-full px-2 py-0.5">
                                        Dir.: {campo.diretor}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {campo.setup_completo ? (
                                <div className="flex items-center gap-1 text-[#2D5016] bg-[#2D5016]/10 rounded-full px-2 py-1">
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
          })
        )}
      </div>
    </main>
  )
}
