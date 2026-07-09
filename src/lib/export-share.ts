import { toast } from 'sonner'

/**
 * Tenta partilhar o ficheiro via Web Share API (mobile).
 * Fallback para download normal se a API não estiver disponível ou falhar.
 * Deve ser chamada directamente dentro de um event handler do utilizador.
 */
export async function exportOrShareFile(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type })

  if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename })
        return
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast.info('Partilha cancelada')
        return
      }
      // Outros erros (NotAllowedError, gesto expirado, etc.) → fallback para download
    }
  }

  // Fallback: download normal
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
