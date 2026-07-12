import { createClient } from '@/lib/supabase/server'
import { LocaisAdminClient } from './LocaisAdminClient'

export const dynamic = 'force-dynamic'

interface Local {
  id: string
  nome: string
  descricao: string | null
  morada: string | null
  ativo: boolean
  created_at: string
}

export default async function LocaisPage() {
  const supabase = createClient()

  const { data: locais } = await supabase
    .from('locais')
    .select('*')
    .order('nome')

  // Contar campos por local (para mostrar quantos campos usam cada local)
  const { data: camposLocais } = await supabase
    .from('campos')
    .select('local')
    .not('local', 'is', null)

  const camposPorLocal: Record<string, number> = {}
  for (const c of camposLocais ?? []) {
    if (c.local) camposPorLocal[c.local] = (camposPorLocal[c.local] ?? 0) + 1
  }

  return (
    <div>
      <div className="bg-white border-b border-[#E7E8D1] px-4 py-4">
        <h1 className="text-xl font-bold text-[#36454F]">Locais</h1>
        <p className="text-xs text-gray-500 mt-0.5">Gestão dos locais de campo</p>
      </div>
      <LocaisAdminClient
        locaisIniciais={(locais ?? []) as Local[]}
        camposPorLocal={camposPorLocal}
      />
    </div>
  )
}
