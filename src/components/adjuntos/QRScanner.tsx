'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface QRScannerProps {
  onRead: (raw: string) => void
  onCancel: () => void
}

type ScanState = 'a_iniciar' | 'a_ler' | 'erro'

export function QRScanner({ onRead, onCancel }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<ScanState>('a_iniciar')
  const [erroMsg, setErroMsg] = useState('')
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const foundRef = useRef(false)

  function pararTudo() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    rafRef.current = null
    streamRef.current = null
  }

  const iniciarScanner = useCallback(async () => {
    setState('a_iniciar')
    setErroMsg('')
    foundRef.current = false
    pararTudo()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()

      setState('a_ler')

      const { default: jsQR } = await import('jsqr')
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      function scan() {
        if (!video || foundRef.current) return
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas!.width = video.videoWidth
          canvas!.height = video.videoHeight
          ctx!.drawImage(video, 0, 0, canvas!.width, canvas!.height)
          const imgData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height)
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code) {
            foundRef.current = true
            pararTudo()
            onRead(code.data)
            return
          }
        }
        rafRef.current = requestAnimationFrame(scan)
      }
      rafRef.current = requestAnimationFrame(scan)
    } catch (e) {
      setState('erro')
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('permission')) {
        setErroMsg('Permissão de câmara negada. Autoriza o acesso à câmara nas definições do browser.')
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setErroMsg('Câmara não encontrada neste dispositivo.')
      } else {
        setErroMsg('Não foi possível iniciar a câmara. Verifica as permissões.')
      }
    }
  }, [onRead])

  useEffect(() => {
    iniciarScanner()
    return () => pararTudo()
  }, [iniciarScanner])

  const handleCancel = () => {
    pararTudo()
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black shrink-0 safe-area-top">
        <p className="text-white text-sm font-semibold">Ler QR Code da Fatura</p>
        <button
          type="button"
          onClick={handleCancel}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Camera + viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* Canvas hidden — só para jsQR */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder spotlight */}
        {state === 'a_ler' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-64 h-64 rounded-2xl"
              style={{
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                border: '3px solid rgba(255,255,255,0.9)',
              }}
            />
          </div>
        )}

        {/* Loading spinner */}
        {state === 'a_iniciar' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-sm">A iniciar câmara...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-black px-4 py-6 shrink-0 text-center space-y-4 safe-area-bottom">
        {state === 'a_ler' && (
          <p className="text-white/60 text-sm">Aponta para o QR Code no fundo da fatura</p>
        )}

        {state === 'erro' && (
          <div className="space-y-3">
            <p className="text-amber-300 text-sm">{erroMsg}</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={iniciarScanner}
                className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-semibold"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-white/15 text-white rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleCancel}
          className="text-white/40 text-xs block mx-auto"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
