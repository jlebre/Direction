import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Campo } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import { getCodeColor } from '@/lib/adjuntos/codes'
import { getPhotoUrl } from '@/lib/adjuntos/supabase-storage'
import DespesaActions from './DespesaActions'

export const dynamic = 'force-dynamic'

export default async function DespesaDetailPage({
  params,
}: {
  params: Promise<{ id: string; despesaId: string }>
}) {
  const { id, despesaId } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: despesa }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase.from('despesas').select('*').eq('id', despesaId).single(),
  ])

  if (!campo || !despesa) notFound()

  const c = campo as Campo
  const d = despesa as Despesa
  const codeColor = getCodeColor(d.codigo)
  const photoUrl = d.foto_path ? getPhotoUrl(d.foto_path) : null

  return (
    <main className="min-h-screen pb-8">
      <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={`/campo/${id}/adjuntos`} className="text-red-200 text-sm">
            ← {c.nome}
          </Link>
          <span className="text-red-200 text-sm">Recibo #{d.numero_recibo}</span>
        </div>
        <div className="max-w-lg mx-auto mt-3">
          <h1 className="text-2xl font-bold">{d.descricao ?? <span className="italic font-normal opacity-70">Sem descrição</span>}</h1>
          <p className="text-3xl font-bold mt-2" style={{ color: d.tipo === 'receita' ? '#86efac' : 'white' }}>
            {d.tipo === 'receita' ? '+' : '−'}€{Number(d.valor).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {photoUrl && (
          <div className="rounded-2xl overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Fatura" className="w-full object-contain max-h-[60vh]" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {[
            ['Data', new Date(d.data + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
            ['Nº Recibo', `#${d.numero_recibo}`],
            ['Descrição', d.descricao ?? '—'],
            ['Categoria', d.codigo_descricao],
            ['Tipo', d.tipo === 'receita' ? 'Receita' : 'Despesa'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-4 py-3.5 gap-4">
              <span className="text-sm text-gray-400 shrink-0">{label}</span>
              <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-4 py-3.5 gap-4">
            <span className="text-sm text-gray-400 shrink-0">Código</span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold"
              style={{ backgroundColor: codeColor + '20', color: codeColor }}
            >
              {d.codigo}
            </span>
          </div>
          <div className="flex justify-between items-center px-4 py-3.5 gap-4">
            <span className="text-sm text-gray-400 shrink-0">NIF CAMTIL</span>
            {d.nif_confirmado ? (
              <span className="text-green-600 font-medium text-sm">✓ Confirmado</span>
            ) : (
              <span className="text-red-500 text-sm">Não confirmado</span>
            )}
          </div>
        </div>

        <Link
          href={`/campo/${id}/adjuntos/despesa/${despesaId}/editar`}
          className="block w-full py-3.5 bg-[#B85042] text-white font-semibold rounded-xl text-center text-base active:opacity-90"
        >
          Editar Despesa
        </Link>
        <DespesaActions despesa={d} campo={c} />
      </div>
    </main>
  )
}
