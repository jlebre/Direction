import { createClient } from '@/lib/supabase/server'
import type { Campo } from '@/types/shared'
import { ESCALAO_COR, ESCALAO_EMOJI, SECCAO_LABELS } from '@/types/shared'
import { CamposAdminClient } from './CamposAdminClient'
import { sairAdmin } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createClient()

  const { data: campos } = await supabase
    .from('campos')
    .select('*')
    .order('ano', { ascending: false })
    .order('nome')

  const lista = (campos ?? []) as Campo[]

  // Estatísticas
  const anos = [...new Set(lista.map((c) => c.ano).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0))
  const porEscalao: Record<string, number> = {}
  lista.forEach((c) => { porEscalao[c.escalao] = (porEscalao[c.escalao] ?? 0) + 1 })
  const locaisUnicos = [...new Set(lista.map((c) => c.local).filter(Boolean))].sort()

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[#E7E8D1] px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#36454F]">⚙️ Campos</h1>
          <p className="text-xs text-gray-500 mt-0.5">Gestão e configuração de campos</p>
        </div>
        <form action={sairAdmin}>
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-red-500 border border-[#E7E8D1] rounded-lg px-3 py-1.5 transition-colors"
          >
            Sair
          </button>
        </form>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 text-center">
            <p className="text-3xl font-bold text-[#36454F]">{lista.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Campos total</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 text-center">
            <p className="text-3xl font-bold text-[#36454F]">{anos.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Anos</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 text-center">
            <p className="text-3xl font-bold text-[#36454F]">{locaisUnicos.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Locais distintos</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 text-center">
            <p className="text-3xl font-bold text-[#36454F]">
              {lista.filter((c) => c.setup_completo).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Configurados</p>
          </div>
        </div>

        {/* Por escalão */}
        <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 space-y-3">
          <h2 className="font-semibold text-[#36454F] text-sm">Por escalão</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(porEscalao).map(([escalao, n]) => {
              const cor = ESCALAO_COR[escalao]
              return (
                <div
                  key={escalao}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  style={{ backgroundColor: cor?.light, borderColor: cor?.border }}
                >
                  <span>{ESCALAO_EMOJI[escalao]}</span>
                  <span className="text-sm font-semibold" style={{ color: cor?.text ?? '#36454F' }}>
                    {escalao}
                  </span>
                  <span className="text-xs font-bold" style={{ color: cor?.bg ?? '#36454F' }}>{n}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Locais */}
        {locaisUnicos.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 space-y-2">
            <h2 className="font-semibold text-[#36454F] text-sm">Locais</h2>
            <div className="flex flex-wrap gap-2">
              {locaisUnicos.map((local) => {
                const count = lista.filter((c) => c.local === local).length
                return (
                  <span key={local} className="text-xs bg-[#F8F8F4] border border-[#E7E8D1] rounded-full px-3 py-1 text-gray-600">
                    {local} <span className="font-bold text-[#36454F]">({count})</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Campos client component */}
        <CamposAdminClient
          camposIniciais={lista}
          escalaoOptions={Object.keys(ESCALAO_COR)}
          escalaoEmoji={ESCALAO_EMOJI}
          seccaoLabels={SECCAO_LABELS}
        />
      </div>
    </div>
  )
}
