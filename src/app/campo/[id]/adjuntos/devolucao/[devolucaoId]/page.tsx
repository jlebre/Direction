import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { CampoPublico } from '@/types/shared'
import type { Devolucao, Despesa } from '@/types/adjuntos'
import { getCodeColor } from '@/lib/adjuntos/codes'
import { getPhotoUrl } from '@/lib/adjuntos/supabase-storage'
import DevolucaoActions from './DevolucaoActions'

export const dynamic = 'force-dynamic'

export default async function DevolucaoDetailPage({
  params,
}: {
  params: Promise<{ id: string; devolucaoId: string }>
}) {
  const { id, devolucaoId } = await params
  const supabase = createClient()

  const [{ data: campo }, { data: devolucao }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('devolucoes')
      .select('*, fatura_original:despesas!fatura_original_id(id, numero_recibo, descricao, valor)')
      .eq('id', devolucaoId)
      .eq('campo_id', id)
      .single(),
  ])

  if (!campo || !devolucao) notFound()

  const { pin, ...campoPublico } = campo
  const c = campoPublico as CampoPublico
  const d = devolucao as Devolucao
  const codeColor = d.codigo ? getCodeColor(d.codigo) : '#6b7280'
  const photoUrl = d.foto_path ? getPhotoUrl(d.foto_path) : null

  return (
    <main className="min-h-screen pb-8">
      <div className="bg-green-700 text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={`/campo/${id}/adjuntos`} className="text-green-200 text-sm">
            ← {c.nome}
          </Link>
          <span className="text-green-200 text-sm">Dev. #{d.numero_devolucao}</span>
        </div>
        <div className="max-w-lg mx-auto mt-3">
          <h1 className="text-2xl font-bold">
            {d.descricao ?? d.codigo_descricao ?? 'Devolução'}
          </h1>
          <p className="text-3xl font-bold mt-2 text-green-200">
            +€{Number(d.valor).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {photoUrl && (
          <div className="rounded-2xl overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Documento" className="w-full object-contain max-h-[60vh]" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {[
            ['Data', new Date(d.data + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
            ['Nº Devolução', `#${d.numero_devolucao}`],
            ['Descrição', d.descricao ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-4 py-3.5 gap-4">
              <span className="text-sm text-gray-400 shrink-0">{label}</span>
              <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
            </div>
          ))}

          {d.codigo && (
            <div className="flex justify-between items-center px-4 py-3.5 gap-4">
              <span className="text-sm text-gray-400 shrink-0">Categoria</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold"
                style={{ backgroundColor: codeColor + '20', color: codeColor }}
              >
                {d.codigo} — {d.codigo_descricao}
              </span>
            </div>
          )}

          {d.fatura_original && (
            <div className="flex justify-between items-center px-4 py-3.5 gap-4">
              <span className="text-sm text-gray-400 shrink-0">Fatura associada</span>
              <Link
                href={`/campo/${id}/adjuntos/despesa/${(d.fatura_original as Despesa).id}`}
                className="text-sm font-medium text-[#B85042] hover:underline text-right"
              >
                #{(d.fatura_original as Despesa).numero_recibo} — {(d.fatura_original as Despesa).descricao ?? '—'}
              </Link>
            </div>
          )}

          {d.notas && (
            <div className="px-4 py-3.5">
              <span className="text-sm text-gray-400 block mb-1">Notas</span>
              <p className="text-sm text-gray-800">{d.notas}</p>
            </div>
          )}
        </div>

        <Link
          href={`/campo/${id}/adjuntos/devolucao/${devolucaoId}/editar`}
          className="block w-full py-3.5 bg-green-700 text-white font-semibold rounded-xl text-center text-base active:opacity-90"
        >
          Editar Devolução
        </Link>
        <DevolucaoActions devolucao={d} campo={c} hasPin={!!pin} />
      </div>
    </main>
  )
}
