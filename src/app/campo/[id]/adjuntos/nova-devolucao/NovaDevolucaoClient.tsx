'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { parseMoney } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import CodeSelector from '@/components/adjuntos/CodeSelector'
import { compressImage } from '@/lib/adjuntos/image-utils'
import { getCampoSlug } from '@/lib/adjuntos/supabase-storage'
import { attachDevolucaoFoto, createDevolucao } from '@/actions/devolucoes'
import type { CampoPublico } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'

interface Props {
  campo: CampoPublico
  faturas: Despesa[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function NovaDevolucaoClient({ campo, faturas }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState(today())
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigo, setCodigo] = useState<string | null>(null)
  const [codigoDescricao, setCodigoDescricao] = useState<string | null>(null)
  const [faturaId, setFaturaId] = useState<string>('')
  const [notas, setNotas] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhotoFile(new File([compressed], file.name, { type: 'image/jpeg' }))
    setPhotoPreview(URL.createObjectURL(compressed))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valor || (parseMoney(valor) ?? 0) <= 0) { toast.error('Valor inválido'); return }
    setSubmitting(true)
    try {
      // Fronteira de servidor (Fase 2.6) — cria a devolução via Server
      // Action (mesmo retry de numero_devolucao de sempre, movido para o
      // servidor). Storage (upload da foto) continua do lado do cliente
      // (2.5) — só depois de ter o número confirmado, tal como antes.
      const created = await createDevolucao({
        campoId: campo.id,
        data,
        valor: parseMoney(valor) ?? 0,
        descricao: descricao.trim() || null,
        codigo: codigo || null,
        codigoDescricao: codigoDescricao || null,
        faturaOriginalId: faturaId || null,
        notas: notas.trim() || null,
      })

      if (created.error || !created.devolucaoId) {
        throw new Error(created.error ?? 'Não foi possível criar número de devolução único')
      }
      const insertedId = created.devolucaoId
      const numeroDevolucao = created.numeroDevolucao!

      // Upload photo now that we have the confirmed numero
      if (photoFile) {
        const slug = getCampoSlug(campo.nome)
        const numStr = String(numeroDevolucao).padStart(3, '0')
        const path = `${slug}/dev-${numStr}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('faturas')
          .upload(path, photoFile, { contentType: 'image/jpeg', upsert: true })
        if (!uploadErr) {
          await attachDevolucaoFoto({ devolucaoId: insertedId, campoId: campo.id, fotoPath: path })
        }
      }

      toast.success(`Devolução #${numeroDevolucao} registada!`)
      router.push(`/campo/${campo.id}/adjuntos`)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registar devolução')
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen pb-10">
      <div className="bg-green-700 text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center gap-3 mb-4">
          <Link href={`/campo/${campo.id}/adjuntos`} className="text-green-200">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Nova Devolução</h1>
        </div>
        <p className="max-w-lg mx-auto text-sm text-green-200">
          Regista uma nota de crédito, reembolso ou devolução. O valor será abatido ao total gasto.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Foto (opcional) */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Documento (opcional)</p>
          {photoPreview ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Documento" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()} className="py-2.5 text-xs font-medium border border-gray-200 rounded-xl text-gray-700 bg-white active:bg-gray-50">📷 Câmara</button>
                <button type="button" onClick={() => galleryRef.current?.click()} className="py-2.5 text-xs font-medium border border-gray-200 rounded-xl text-gray-700 bg-white active:bg-gray-50">🖼 Galeria</button>
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }} className="py-2.5 text-xs font-medium border border-red-200 rounded-xl text-red-500 bg-white active:bg-red-50">Remover</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => cameraRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 active:bg-gray-50">
                <span className="text-2xl">📷</span>
                <p className="text-sm font-medium">Câmara</p>
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 active:bg-gray-50">
                <span className="text-2xl">🖼</span>
                <p className="text-sm font-medium">Galeria</p>
              </button>
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </section>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div className="space-y-1">
            <Label>Data *</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label>Valor (€) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              <Input
                type="text"
                inputMode="decimal"
                className="pl-7"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Devolução Continente, Nota de crédito..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Input
              placeholder="Observações adicionais..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</p>
          <CodeSelector
            selected={codigo}
            onSelect={(code: string, desc: string) => { setCodigo(code); setCodigoDescricao(desc) }}
          />
        </div>

        {faturas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
            <Label>Fatura associada (opcional)</Label>
            <select
              value={faturaId}
              onChange={(e) => setFaturaId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800"
            >
              <option value="">— Sem fatura associada —</option>
              {faturas.map((f) => (
                <option key={f.id} value={f.id}>
                  #{f.numero_recibo} — {f.descricao ?? f.codigo_descricao ?? f.codigo} — €{Number(f.valor).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-12 text-base font-bold bg-green-700 hover:bg-green-800 text-white"
        >
          {submitting ? 'A registar...' : 'Registar Devolução'}
        </Button>
      </form>
    </main>
  )
}
