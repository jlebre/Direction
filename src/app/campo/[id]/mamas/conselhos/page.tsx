import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/mamas/Header'
import { DICAS, CONTACTOS_NACIONAIS } from '@/lib/dicas-content'

export const dynamic = 'force-dynamic'

export default async function ConselhosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const { data: campo } = await supabase.from('campos').select('id, nome').eq('id', id).single()
  if (!campo) notFound()

  return (
    <>
      <Header title="Conselhos" backHref={`/campo/${id}/mamas`} />
      <div className="max-w-2xl mx-auto px-4 py-5 pb-24 space-y-4">
        <p className="text-sm text-gray-500">
          Dicas práticas das mamãs CAMTIL, compiladas de campos reais. Conteúdo fixo, atualizado pela direção.
        </p>

        {DICAS.map((secao) => (
          <div key={secao.id} className="bg-white border border-[#E7E8D1] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#2D5016]/5 border-b border-[#E7E8D1]">
              <span className="text-lg">{secao.emoji}</span>
              <h2 className="font-bold text-sm text-[#2D5016]">{secao.titulo}</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed px-4 py-3 whitespace-pre-line">
              {secao.conteudo}
            </p>
          </div>
        ))}

        <div className="bg-white border border-[#E7E8D1] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#2D5016]/5 border-b border-[#E7E8D1]">
            <span className="text-lg">📞</span>
            <h2 className="font-bold text-sm text-[#2D5016]">Contactos de Emergência</h2>
          </div>
          <ul className="divide-y divide-[#E7E8D1]">
            {CONTACTOS_NACIONAIS.map((c) => (
              <li key={c.tipo} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-700">{c.nome}</p>
                <p className="text-sm font-mono font-bold text-[#2D5016]">{c.telefone}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
