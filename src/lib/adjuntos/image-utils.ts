export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Roda um Blob de imagem pelo número de graus especificado (múltiplo de 90).
 * Devolve um novo Blob JPEG sem alterar o original.
 */
export async function rotateImageBlob(blob: Blob, degrees: number): Promise<Blob> {
  const norm = ((Math.round(degrees / 90) * 90) % 360 + 360) % 360
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const swap = norm === 90 || norm === 270
      const canvas = document.createElement('canvas')
      canvas.width = swap ? img.height : img.width
      canvas.height = swap ? img.width : img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(img.src); reject(new Error('No canvas context')); return }
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((norm * Math.PI) / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      URL.revokeObjectURL(img.src)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Rotation failed')), 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Image load failed')) }
    img.src = URL.createObjectURL(blob)
  })
}

/** Devolve as dimensões (largura × altura) de um Blob de imagem. */
export async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(img.src); resolve({ width: img.width, height: img.height }) }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Image load failed')) }
    img.src = URL.createObjectURL(blob)
  })
}

/** Verdadeiro quando a imagem é landscape (largura > altura × 1.15) — provável fatura rodada. */
export function isLikelyRotated(width: number, height: number): boolean {
  return width > height * 1.15
}
