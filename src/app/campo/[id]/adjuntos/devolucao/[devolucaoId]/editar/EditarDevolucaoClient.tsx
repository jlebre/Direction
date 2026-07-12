'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { parseMoney } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import CodeSelector from '@/components/adjuntos/CodeSelector'
import { compressImage } from '@/lib/adjuntos/image-utils'
import { getCampoSlug } from '@/lib/adjuntos/supabase-storage'
import { getPhotoUrl } from '@/lib/adjuntos/supabase-storage'
import type { CampoPublico } from '@/types/shared'
import { validatePin } from '@/actions/validatePin'
import type { Devolucao, Despesa } from '@/types/adjuntos'
import PinDialog from '@/components/shared/PinDialog'

type PhotoState =
  | { mode: 'keep'; url: string; path: string }
  | { mode: 'replace'; file: File; preview: string }
  | { mode: 'remove'; oldPath: string }
  | { mode: 'none' }

interface Props {
  campo: CampoPublico
  hasPin: boolean
  devolucao: Devolucao
  faturas: Despesa[]
}

export default function EditarDevolucaoClient({ campo, hasPin, devolucao, faturas }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [showPin, setShowPin] = useState(hasPin)
  const [pinError, setPinError] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(!hasPin)

  const existingUrl = devolucao.foto_path ? getPhotoUrl(devolucao.foto_path) : null

  const [data, setData] = useState(devolucao.data)
  const [valor, setValor] = useState(Number(devolucao.valor).toFixed(2))
  const [descricao, setDescricao] = useState(devolucao.descricao ?? '')
  const [codigo, setCodigo] = useState<string | null>(devolucao.codigo)
  const [codigoDescricao, setCodigoDescricao] = useState<string | null>(devolucao.codigo_descricao)
  const [faturaId, setFaturaId] = useState<string>(devolucao.fatura_original_id ?? '')
  const [notas, setNotas] = useState(devolucao.notas ?? '')
  const [photoState, setPhotoState] = useState<PhotoState>(
    existingUrl && devolucao.foto_path
      ? { mode: 'keep', url: existingUrl, path: devolucao.foto_path }
      : { mode: 'none' }
  )
  const [submitting, setSubmitting] = useState(false)

  async function handlePinConfirm(pin: string) {
    const valid = await validatePin(campo.id, pin)
    if (valid) { setPinUnlocked(true); setShowPin(false); setPinError(false) }
    else { setPinError(true); setTimeout(() => setPinError(false), 1200) }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhotoState({ mode: 'replace', file: new File([compressed], file.name, { type: 'image/jpeg' }), preview: URL.createObjectURL(compressed) })
  }

  function removePhoto() {
    if (devolucao.foto_path) setPhotoState({ mode: 'remove', oldPath: devolucao.foto_path })
    else setPhotoState({ mode: 'none' })
  }

  function canSave() {
    return !!valor && (parseMoney(valor) ?? 0) > 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave()) return
    setSubmitting(true)
    try {
      let fotoPath: string | null = devolucao.foto_path ?? null

      if (photoState.mode === 'replace') {
        const slug = getCampoSlug(campo.nome)
        const numStr = String(devolucao.numero_devolucao).padStart(3, '0')
        const path = `${slug}/dev-${numStr}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('faturas')
          .upload(path, photoState.file, { contentType: 'image/jpeg', upsert: true })
        if (!uploadErr) fotoPath = path
        if (devolucao.foto_path && devolucao.foto_path !== path) {
          await supabase.storage.from('faturas').remove([devolucao.foto_path])
        }
      } else if (photoState.mode === 'remove') {
        await supabase.storage.from('faturas').remove([photoState.oldPath])
        fotoPath = null
      } else if (photoState.mode === 'keep') {
        fotoPath = photoState.path
      } else {
        fotoPath = null
      }

      const { error } = await supabase
        .from('devolucoes')
        .update({
          data,
          valor: parseMoney(valor) ?? 0,
          descricao: descricao.trim() || null,
          codigo: codigo || null,
          codigo_descricao: codigoDescricao || null,
          fatura_original_id: faturaId || null,
          notas: notas.trim() || null,
          foto_path: fotoPath,
        })
        .eq('id', devolucao.id)
      if (error) throw error
      toast.success('Devolução atualizada!')
      router.push(`/campo/${campo.id}/adjuntos/devolucao/${devolucao.id}`)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
      setSubmitting(false)
    }
  }

  if (showPin) {
    return (
      <PinDialog
        onConfirm={handlePinConfirm}
        onCancel={() => router.back()}
        error={pinError}
        subtitle="Introduz o PIN para editar esta devolução."
      />
    )
  }
  if (!pinUnlocked) return null

  const currentPhotoUrl =
    photoState.mode === 'keep' ? photoState.url :
    photoState.mode === 'replace' ? photoState.preview :
    null

  return (
    <main className="min-h-screen pb-10">
      <div className="bg-green-700 text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={`/campo/${campo.id}/adjuntos/devolucao/${devolucao.id}`} className="text-green-200 text-sm">
            ← Cancelar
          </Link>
          <span className="text-green-200 text-sm">Dev. #{devolucao.numero_devolucao}</span>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <h1 className="text-xl font-bold">Editar Devolução</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Foto */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Documento</p>
          {currentPhotoUrl ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentPhotoUrl} alt="Documento" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()} className="py-2.5 text-xs font-medium border border-gray-200 rounded-xl text-gray-700 bg-white active:bg-gray-50">📷 Câmara</button>
                <button type="button" onClick={() => galleryRef.current?.click()} className="py-2.5 text-xs font-medium border border-gray-200 rounded-xl text-gray-700 bg-white active:bg-gray-50">🖼 Galeria</button>
                <button type="button" onClick={removePhoto} className="py-2.5 text-xs font-medium border border-red-200 rounded-xl text-red-500 bg-white active:bg-red-50">Remover</button>
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
          disabled={!canSave() || submitting}
          className="w-full h-12 text-base font-bold bg-green-700 hover:bg-green-800 text-white"
        >
          {submitting ? 'A guardar...' : 'Guardar Alterações'}
        </Button>
      </form>
    </main>
  )
}
