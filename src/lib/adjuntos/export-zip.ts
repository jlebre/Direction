import JSZip from 'jszip'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif } from '@/types/adjuntos'
import { getPhotoUrl } from './supabase-storage'
import { generateExcelBuffer } from './export-excel'

function getFilenameFromPath(path: string): string {
  return path.split('/').pop() ?? path
}

export async function generateZip(
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = []
): Promise<void> {
  const zip = new JSZip()

  // Excel dentro do ZIP
  const excelBuffer = generateExcelBuffer(campo, despesas, regularizacoes)
  zip.file('faturas.xlsx', excelBuffer)

  // Imagens
  const imgFolder = zip.folder('imagens')!
  const despesasComFoto = despesas.filter((d) => d.foto_path && d.tipo === 'despesa')

  await Promise.allSettled(
    despesasComFoto.map(async (d) => {
      try {
        const url = getPhotoUrl(d.foto_path!)
        const response = await fetch(url)
        if (!response.ok) return
        const blob = await response.blob()
        const filename = getFilenameFromPath(d.foto_path!)
        imgFolder.file(filename, blob)
      } catch {
        // Falha silenciosa por imagem — o ZIP é gerado mesmo sem ela
      }
    })
  )

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `CAMTIL_${campo.nome.replace(/\s/g, '_')}_Exportacao.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
