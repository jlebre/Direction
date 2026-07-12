import { createClient } from '@/lib/supabase/server'
import { ValoresRefClient } from './ValoresRefClient'
import { VALORES_REF_VERAO } from '@/lib/adjuntos/valores-referencia'
import { ESCALAO_COR } from '@/types/shared'

export const dynamic = 'force-dynamic'

export default async function ValoresRefPage() {
  const supabase = createClient()

  const { data: dbValores } = await supabase
    .from('valores_referencia')
    .select('escalao, ano, codigo, valor')
    .order('escalao')
    .order('codigo')

  const valoresDb = (dbValores ?? []) as { escalao: string; ano: number; codigo: string; valor: number }[]

  return (
    <div>
      <div className="bg-white border-b border-[#E7E8D1] px-4 py-4">
        <h1 className="text-xl font-bold text-[#36454F]">Valores de Referência</h1>
        <p className="text-xs text-gray-500 mt-0.5">Orçamentos por escalão e ano — sobrepõem os valores padrão do sistema</p>
      </div>
      <ValoresRefClient
        valoresDb={valoresDb}
        escalaoOptions={Object.keys(VALORES_REF_VERAO)}
        escalaoDefaults={VALORES_REF_VERAO}
        escalaoColors={ESCALAO_COR}
      />
    </div>
  )
}
