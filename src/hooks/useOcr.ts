'use client'

import { useState, useCallback } from 'react'
import { parsearFatura } from '@/lib/adjuntos/ocr-parser'
import type { OcrResultado } from '@/lib/adjuntos/ocr-parser'

export type OcrStatus = 'idle' | 'a_carregar' | 'a_processar' | 'done' | 'error'

export type { OcrResultado }

export function useOcr() {
  const [status, setStatus] = useState<OcrStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [resultado, setResultado] = useState<OcrResultado | null>(null)

  const processar = useCallback(async (imagem: File | string) => {
    setStatus('a_carregar')
    setProgress(0)
    setResultado(null)
    setStatusMsg('A carregar motor OCR...')

    try {
      // Dynamic import — evita erros de SSR
      const { createWorker } = await import('tesseract.js')

      const worker = await createWorker('por+eng', 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
            setStatusMsg('A inicializar...')
            setProgress(Math.round(m.progress * 20))
          } else if (m.status === 'loading language traineddata' || m.status === 'loaded language traineddata') {
            setStatusMsg('A carregar modelo de linguagem (1ª vez pode demorar)...')
            setStatus('a_carregar')
            setProgress(20 + Math.round(m.progress * 30))
          } else if (m.status === 'recognizing text') {
            setStatus('a_processar')
            setStatusMsg('A interpretar texto...')
            setProgress(50 + Math.round(m.progress * 50))
          }
        },
      })

      const { data: { text } } = await worker.recognize(imagem)
      await worker.terminate()

      const ocr = parsearFatura(text)
      setResultado(ocr)
      setStatus('done')
      setProgress(100)
    } catch (e) {
      console.error('[OCR] Falha:', e)
      setStatus('error')
      setStatusMsg('Erro ao interpretar imagem')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setStatusMsg('')
    setResultado(null)
  }, [])

  return { status, progress, statusMsg, resultado, processar, reset }
}
