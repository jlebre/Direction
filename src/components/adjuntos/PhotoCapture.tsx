'use client'

import { useRef, useState } from 'react'
import { compressImage, formatBytes } from '@/lib/adjuntos/image-utils'

interface Props {
  onPhoto: (file: File, preview: string) => void
  onSkip: () => void
  currentPreview?: string | null
}

export default function PhotoCapture({ onPhoto, onSkip, currentPreview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentPreview ?? null)
  const [loading, setLoading] = useState(false)
  const [fileSize, setFileSize] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[4/3]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Fatura" className="w-full h-full object-cover" />
          {fileSize && (
            <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
              {fileSize}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 font-medium active:bg-gray-50"
        >
          Trocar foto
        </button>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl active:bg-gray-50 transition-colors"
      >
        {loading ? (
          <div className="w-10 h-10 border-4 border-[#2D5016] border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span className="text-5xl">📷</span>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg">Fotografar Fatura</p>
              <p className="text-sm text-gray-400 mt-1">Abre a câmara ou galeria</p>
            </div>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <button type="button" onClick={onSkip} className="w-full py-3 text-sm text-gray-400 font-medium">
        Não tenho foto agora →
      </button>
    </div>
  )
}
