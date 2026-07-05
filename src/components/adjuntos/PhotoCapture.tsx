'use client'

import { useRef, useState } from 'react'
import { compressImage, formatBytes } from '@/lib/adjuntos/image-utils'

interface Props {
  onPhoto: (file: File, preview: string) => void
  onSkip: () => void
  currentPreview?: string | null
}

export default function PhotoCapture({ onPhoto, onSkip, currentPreview }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentPreview ?? null)
  const [loading, setLoading] = useState(false)
  const [fileSize, setFileSize] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so same file can be re-selected
    e.target.value = ''
    setLoading(true)
    try {
      const compressed = await compressImage(file)
      const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' })
      const url = URL.createObjectURL(compressed)
      setPreview(url)
      setFileSize(formatBytes(compressed.size))
      onPhoto(compressedFile, url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {preview ? (
        <>
          <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Fatura" className="w-full h-full object-cover" />
            {fileSize && (
              <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                {fileSize}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={loading}
              className="py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 font-medium active:bg-gray-50 disabled:opacity-50"
            >
              📷 Câmara
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={loading}
              className="py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 font-medium active:bg-gray-50 disabled:opacity-50"
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
      )}

      {/* Câmara: capture=environment força abertura directa da câmara */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {/* Galeria: sem capture — mostra selector de ficheiros completo */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {!preview && (
        <button type="button" onClick={onSkip} className="w-full py-3 text-sm text-gray-400 font-medium">
          Não tenho foto agora →
        </button>
      )}
    </div>
  )
}
