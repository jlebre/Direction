import JSZip from 'jszip'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif, DespesaLinha, Devolucao } from '@/types/adjuntos'
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

// ── Fase 0.5 (backup integral) ───────────────────────────────────────────────
// `buildZip` foi extraído de `generateZip` para poder ser reutilizado pelo
// script de backup administrativo (scripts/backup/run-backup.ts), que corre em
// Node e não pode chamar `exportOrShareFile` (usa APIs de browser — Web Share/
// <a download>). `generateZip` mantém exatamente o mesmo comportamento de
// sempre: chama `buildZip` com outputType 'blob' e depois partilha/descarrega
// o resultado, tal como fazia antes desta extração.
export async function buildZip(
  supabase: SupabaseClient,
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = [],
  despesaLinhas: DespesaLinha[] = [],
  devolucoes: Devolucao[] = [],
  outputType: 'blob' | 'nodebuffer' = 'blob'
): Promise<Blob | Buffer> {
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

  // Fase 2.8 (Storage isolation) — bucket privado agora: já não se pode ir
  // buscar bytes por URL pública (`getPhotoUrl` + `fetch`), isso deixou de
  // funcionar. `.storage.download()` passa pela Storage API autenticada,
  // respeita a RLS por campo tal como qualquer outra leitura — mesmo
  // comportamento de sempre para quem já tinha acesso (incl. anon num campo
  // com `legacy_anon_access`), sem alterar a UI nem introduzir signed URLs
  // onde a API autenticada já resolve.
  await Promise.allSettled(
    despesasComFoto.map(async (d) => {
      try {
        const { data, error } = await supabase.storage.from('faturas').download(d.foto_path!)
        if (error || !data) return
        // ArrayBuffer em vez de Blob: mesmos bytes no ZIP final, mas suportado
        // pelo JSZip tanto no browser como em Node (usado pelo script de
        // backup — Node não tem sempre um Blob que o JSZip reconheça).
        const imgBuf = await data.arrayBuffer()
        imgFolder.file(imageFilenameForDespesa(d), imgBuf)
      } catch {
        // Falha silenciosa por imagem — o ZIP é gerado mesmo sem ela
      }
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return zip.generateAsync({
    type: outputType as any,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  }) as Promise<Blob | Buffer>
}

export async function generateZip(
  supabase: SupabaseClient,
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = [],
  despesaLinhas: DespesaLinha[] = [],
  devolucoes: Devolucao[] = []
): Promise<void> {
  const safeName = sanitizeFilename(campo.nome)
  const dateStr = new Date().toISOString().split('T')[0]

  const zipBlob = (await buildZip(supabase, campo, despesas, regularizacoes, despesaLinhas, devolucoes, 'blob')) as Blob

  const { exportOrShareFile } = await import('@/lib/export-share')
  await exportOrShareFile(zipBlob, `relatorio-contas-${safeName}-${dateStr}.zip`)
}
