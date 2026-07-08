'use client'

import { useRef, useState } from 'react'
import { compressImage, formatBytes, rotateImageBlob, getImageDimensions, isLikelyRotated } from '@/lib/adjuntos/image-utils'

interface Props {
  onPhoto: (file: File, preview: string) => void
  onSkip: () => void
  onQrCode?: () => void
  currentPreview?: string | null
}

export default function PhotoCapture({ onPhoto, onSkip, onQrCode, currentPreview }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentPreview ?? null)
  const [loading, setLoading] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [fileSize, setFileSize] = useState<string | null>(null)
  // Blob original (pós-compressão) para rodar sem acumular degradação JPEG
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null)
  const [rotationDeg, setRotationDeg] = useState(0)
  const [isLandscape, setIsLandscape] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLoading(true)
    try {
      const compressed = await compressImage(file)
      const { width, height } = await getImageDimensions(compressed)

      setOriginalBlob(compressed)
      setRotationDeg(0)
      setIsLandscape(isLikelyRotated(width, height))

      const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' })
      const url = URL.createObjectURL(compressed)
      setPreview(url)
      setFileSize(formatBytes(compressed.size))
      onPhoto(compressedFile, url)
    } finally {
      setLoading(false)
    }
  }

  async function rotate(direction: 'esq' | 'dir') {
    if (!originalBlob || rotating) return
    setRotating(true)
    try {
      const delta = direction === 'dir' ? 90 : -90
      const newDeg = ((rotationDeg + delta) + 360) % 360
      // Rodar sempre a partir do blob original — evita degradação acumulada
      const rotated = await rotateImageBlob(originalBlob, newDeg)
      const { width, height } = await getImageDimensions(rotated)

      setRotationDeg(newDeg)
      setIsLandscape(isLikelyRotated(width, height))

      const rotatedFile = new File([rotated], 'fatura.jpg', { type: 'image/jpeg' })
      const url = URL.createObjectURL(rotated)
      setPreview(url)
      setFileSize(formatBytes(rotated.size))
      onPhoto(rotatedFile, url)  // Re-dispara OCR automaticamente
    } finally {
      setRotating(false)
    }
  }

  const busy = loading || rotating

  return (
    <div className="space-y-3">
      {/* Dicas fotografia */}
      <details className="text-xs text-gray-400 select-none">
        <summary className="cursor-pointer list-none flex items-center gap-1.5 py-0.5 hover:text-gray-500 transition-colors">
          <span>💡</span>
          <span>Como tirar uma boa foto?</span>
        </summary>
        <ul className="mt-1.5 ml-4 space-y-0.5 list-disc">
          <li>Fotografa na vertical, com a fatura inteira visível</li>
          <li>Apanha o total e o NIF (geralmente no fundo)</li>
          <li>Boa iluminação — sem sombras nem reflexos</li>
          <li>Se a foto ficou de lado, usa ↺ ↻ para corrigir</li>
        </ul>
      </details>

      {preview ? (
        <>
          {/* Aviso de landscape */}
          {isLandscape && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span className="shrink-0">📐</span>
              <p className="text-xs text-amber-700">
                A foto parece estar de lado — roda com ↺ ↻ para melhorar o OCR.
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Fatura" className="w-full object-contain max-h-72" />
            {fileSize && (
              <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                {fileSize}
              </span>
            )}
            {rotating && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-[#B85042] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Botões de rotação */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => rotate('esq')}
              disabled={busy}
              className="py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium disabled:opacity-40 active:bg-gray-50"
            >
              ↺ Rodar esq.
            </button>
            <button
              type="button"
              onClick={() => rotate('dir')}
              disabled={busy}
              className="py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium disabled:opacity-40 active:bg-gray-50"
            >
              Rodar dir. ↻
            </button>
          </div>

          {/* Substituir foto */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 disabled:opacity-40 active:bg-gray-50"
            >
              📷 Câmara
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={busy}
              className="py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 disabled:opacity-40 active:bg-gray-50"
            >
              🖼 Galeria
            </button>
          </div>
        </>
      ) : loading ? (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="w-10 h-10 border-4 border-[#B85042] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">A processar imagem...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 py-10 bg-white border-2 border-dashed border-gray-200 rounded-2xl active:bg-gray-50 transition-colors"
            >
              <span className="text-4xl">📷</span>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">Câmara</p>
                <p className="text-xs text-gray-400 mt-0.5">Tirar fotografia</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 py-10 bg-white border-2 border-dashed border-gray-200 rounded-2xl active:bg-gray-50 transition-colors"
            >
              <span className="text-4xl">🖼</span>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">Galeria</p>
                <p className="text-xs text-gray-400 mt-0.5">Escolher ficheiro</p>
              </div>
            </button>
          </div>
          {onQrCode && (
            <button
              type="button"
              onClick={onQrCode}
              className="w-full flex items-center gap-3 px-5 py-4 bg-white border-2 border-dashed border-blue-200 rounded-2xl active:bg-blue-50 transition-colors"
            >
              <span className="text-3xl shrink-0">📱</span>
              <div className="text-left">
                <p className="font-semibold text-blue-700 text-sm">Ler QR Code da fatura</p>
                <p className="text-xs text-gray-400 mt-0.5">Mais rápido — sem precisar de foto</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* capture=environment força câmara; sem capture abre seletor completo */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {!preview && !loading && (
        <button type="button" onClick={onSkip} className="w-full py-3 text-sm text-gray-400 font-medium">
          Não tenho foto agora →
        </button>
      )}
    </div>
  )
}
