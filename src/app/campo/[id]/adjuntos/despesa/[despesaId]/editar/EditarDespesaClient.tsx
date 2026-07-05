'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { compressImage } from '@/lib/adjuntos/image-utils'
import { getCampoSlug, getPhotoFilename } from '@/lib/adjuntos/supabase-storage'
import type { Campo } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import CodeSelector from '@/components/adjuntos/CodeSelector'
import PinDialog from '@/components/shared/PinDialog'
import Toast from '@/components/shared/Toast'

type PhotoState =
  | { mode: 'keep'; url: string; path: string }
  | { mode: 'replace'; file: File; preview: string }
  | { mode: 'remove'; oldPath: string }
  | { mode: 'none' }

interface Props {
  campo: Campo
  despesa: Despesa
  existingPhotoUrl: string | null
}

export default function EditarDespesaClient({ campo, despesa, existingPhotoUrl }: Props) {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [showPin, setShowPin] = useState(!!campo.pin)
  const [pinError, setPinError] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(!campo.pin)

  const [valor, setValor] = useState(Number(despesa.valor).toFixed(2))
  const [descricao, setDescricao] = useState(despesa.descricao ?? '')
  const [data, setData] = useState(despesa.data)
  const [codigo, setCodigo] = useState<string | null>(despesa.codigo)
  const [codigoDescricao, setCodigoDescricao] = useState<string | null>(despesa.codigo_descricao)
  const [nifConfirmado, setNifConfirmado] = useState(despesa.nif_confirmado)

  const [photoState, setPhotoState] = useState<PhotoState>(
    existingPhotoUrl && despesa.foto_path
      ? { mode: 'keep', url: existingPhotoUrl, path: despesa.foto_path }
      : { mode: 'none' }
  )

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function handlePinConfirm(pin: string) {
    if (pin === campo.pin) { setPinUnlocked(true); setShowPin(false); setPinError(false) }
    else { setPinError(true); setTimeout(() => setPinError(false), 1200) }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' })
    const preview = URL.createObjectURL(compressed)
    setPhotoState({ mode: 'replace', file: compressedFile, preview })
  }

  function removePhoto() {
    if (despesa.foto_path) {
      setPhotoState({ mode: 'remove', oldPath: despesa.foto_path })
    } else {
      setPhotoState({ mode: 'none' })
    }
  }

  function canSave() {
    return !!valor && parseFloat(valor) > 0 && !!codigo
  }

  async function handleSubmit() {
    if (!canSave()) return
    setSubmitting(true)
    try {
      let fotoPath: string | null = despesa.foto_path ?? null

      if (photoState.mode === 'replace') {
        const filename = getPhotoFilename(campo.nome, despesa.numero_recibo)
        const slug = getCampoSlug(campo.nome)
        const path = `${slug}/${filename}`
        const { error: uploadError } = await supabase.storage
          .from('faturas')
          .upload(path, photoState.file, { contentType: 'image/jpeg', upsert: true })
        if (!uploadError) fotoPath = path
        // Remove old file only if it has a different path (edge case)
        if (despesa.foto_path && despesa.foto_path !== path) {
          await supabase.storage.from('faturas').remove([despesa.foto_path])
        }
      } else if (photoState.mode === 'remove') {
        await supabase.storage.from('faturas').remove([photoState.oldPath])
        fotoPath = null
      } else if (photoState.mode === 'keep') {
        fotoPath = photoState.path
      } else {
        fotoPath = null
      }

      const { error: updateError } = await supabase
        .from('despesas')
        .update({
          valor: parseFloat(valor),
          descricao: descricao.trim() || null,
          data,
          codigo: codigo!,
          codigo_descricao: codigoDescricao!,
          nif_confirmado: nifConfirmado,
          foto_path: fotoPath,
        })
        .eq('id', despesa.id)

      if (updateError) throw updateError

      setToast({ msg: 'Despesa atualizada!', type: 'success' })
      setTimeout(() => {
        router.push(`/campo/${campo.id}/adjuntos/despesa/${despesa.id}`)
        router.refresh()
      }, 800)
    } catch {
      setToast({ msg: 'Erro ao guardar. Tenta de novo.', type: 'error' })
      setSubmitting(false)
    }
  }

  if (showPin) {
    return (
      <PinDialog
        onConfirm={handlePinConfirm}
        onCancel={() => router.back()}
        error={pinError}
        subtitle="Introduz o PIN para editar esta despesa."
      />
    )
  }
  if (!pinUnlocked) return null

  const currentPhotoUrl =
    photoState.mode === 'keep' ? photoState.url :
    photoState.mode === 'replace' ? photoState.preview :
    null

  return (
    <main className="min-h-screen pb-8">
      <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link
            href={`/campo/${campo.id}/adjuntos/despesa/${despesa.id}`}
            className="text-red-200 text-sm"
          >
            ← Cancelar
          </Link>
          <span className="text-red-200 text-sm">Recibo #{despesa.numero_recibo}</span>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <h1 className="text-xl font-bold">Editar Despesa</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Imagem */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Imagem</h2>
          {currentPhotoUrl ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentPhotoUrl} alt="Fatura" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 text-xs font-medium border border-gray-200 rounded-xl text-gray-700 bg-white active:bg-gray-50"
                >
                  📷 Câmara
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-2.5 text-xs font-medium border border-gray-200 rounded-xl text-gray-700 bg-white active:bg-gray-50"
                >
                  🖼 Galeria
                </button>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="py-2.5 text-xs font-medium border border-red-200 rounded-xl text-red-500 bg-white active:bg-red-50"
                >
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 active:bg-gray-50"
              >
                <span className="text-3xl">📷</span>
                <p className="text-sm font-medium">Câmara</p>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 active:bg-gray-50"
              >
                <span className="text-3xl">🖼</span>
                <p className="text-sm font-medium">Galeria</p>
              </button>
            </div>
          )}
          {/* Câmara: capture=environment abre câmara directamente */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Galeria: sem capture — mostra selector de ficheiros completo */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </section>

        {/* Detalhes */}
        <section className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          <div className="px-4 py-3">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Valor (€)</label>
            <div className="flex items-center">
              <span className="text-xl text-gray-400 mr-1.5">€</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="px-4 py-3">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value.slice(0, 100))}
              placeholder="Opcional"
              rows={2}
              className="w-full text-sm text-gray-900 focus:outline-none resize-none placeholder:text-gray-300"
            />
            <p className="text-xs text-gray-300 text-right mt-1">{descricao.length}/100</p>
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="text-sm font-medium text-gray-900 focus:outline-none"
            />
          </div>

          <div className="px-4 py-3">
            <label className="flex items-center justify-between cursor-pointer gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">NIF CAMTIL confirmado</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">501 979 891</p>
              </div>
              <input
                type="checkbox"
                checked={nifConfirmado}
                onChange={(e) => setNifConfirmado(e.target.checked)}
                className="w-5 h-5 accent-[#B85042] cursor-pointer shrink-0"
              />
            </label>
          </div>
        </section>

        {/* Categoria */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categoria</h2>
          <CodeSelector
            selected={codigo}
            onSelect={(code, desc) => { setCodigo(code); setCodigoDescricao(desc) }}
          />
        </section>

        <button
          type="button"
          disabled={!canSave() || submitting}
          onClick={handleSubmit}
          className="w-full py-4 bg-[#B85042] text-white font-bold text-base rounded-xl disabled:opacity-40 active:opacity-90"
        >
          {submitting ? 'A guardar...' : 'Guardar Alterações'}
        </button>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </main>
  )
}
