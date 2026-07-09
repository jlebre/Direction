import JSZip from 'jszip'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif, DespesaLinha, Devolucao } from '@/types/adjuntos'
import { getPhotoUrl } from './supabase-storage'
import { generateExcelBuffer } from './export-excel'

function getFilenameFromPath(path: string): string {
  return path.split('/').pop() ?? path
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Sanitiza nome de imagem usando a referência da fatura */
function imageFilenameForDespesa(d: Despesa): string {
  const ext = (d.foto_path?.split('.').pop() ?? 'jpg').toLowerCase()
  return `recibo_${String(d.numero_recibo).padStart(4, '0')}.${ext}`
}

export async function generateZip(
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = [],
  despesaLinhas: DespesaLinha[] = [],
  devolucoes: Devolucao[] = []
): Promise<void> {
  const zip = new JSZip()

  const safeName = sanitizeFilename(campo.nome)
  const dateStr = new Date().toISOString().split('T')[0]
  const excelFilename = `relatorio-contas-${safeName}-${dateStr}.xlsx`

  // Excel dentro do ZIP
  const excelU8 = generateExcelBuffer(campo, despesas, regularizacoes, despesaLinhas, devolucoes)
  zip.file(excelFilename, excelU8)

  // Imagens — nome baseado na referência da fatura
  const imgFolder = zip.folder('imagens')!
  const despesasComFoto = despesas.filter((d) => d.foto_path && d.tipo === 'despesa')

  await Promise.allSettled(
    despesasComFoto.map(async (d) => {
      try {
        const url = getPhotoUrl(d.foto_path!)
        const response = await fetch(url)
        if (!response.ok) return
        const imgBlob = await response.blob()
        imgFolder.file(imageFilenameForDespesa(d), imgBlob)
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

  const { exportOrShareFile } = await import('@/lib/export-share')
  await exportOrShareFile(zipBlob, `relatorio-contas-${safeName}-${dateStr}.zip`)
}
