import * as XLSX from 'xlsx'
import type { Campo } from '@/types/shared'
import type { EstimativaItem, OrcamentoItem } from '@/types/mamas'
import { exportOrShareFile } from '@/lib/export-share'

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export async function exportOrcamento(
  campo: Campo,
  estimativas: EstimativaItem[],
  extras: OrcamentoItem[],
  totalPrevisto: number | null
): Promise<void> {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Estimativas por ingrediente ──────────────────────────────────
  const semPreco = estimativas.filter((e) => e.total === null)
  const comPreco = estimativas.filter((e) => e.total !== null)
  const totalEstimado = comPreco.reduce((s, e) => s + (e.total ?? 0), 0)

  const rows1: (string | number | null)[][] = [
    ['Campo', campo.nome],
    ['Mamã', campo.mama ?? ''],
    ['Período', campo.datas ?? ''],
    ['Exportado em', formatDatePT(new Date().toISOString().split('T')[0])],
    [],
    ['Categoria', 'Ingrediente', 'Quantidade', 'Unidade', 'Preço/un (€)', 'Total estimado (€)', 'Notas'],
  ]

  for (const item of estimativas.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))) {
    rows1.push([
      item.categoria,
      item.nome,
      item.quantidade,
      item.unidade,
      item.preco ?? null,
      item.total ?? null,
      item.total === null ? 'Preço em falta' : null,
    ])
  }

  rows1.push([])
  rows1.push(['', '', '', '', 'TOTAL ESTIMADO', totalEstimado, null])
  if (semPreco.length > 0) {
    rows1.push(['', '', '', '', `(${semPreco.length} sem preço)`, null, null])
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rows1)
  ws1['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Estimativas Alimentação')

  // ── Sheet 2: Ingredientes sem preço ──────────────────────────────────────
  if (semPreco.length > 0) {
    const rows2: (string | number | null)[][] = [
      ['Ingredientes sem preço de referência'],
      ['Adicionar preços em Mamãs → Preços para completar a estimativa'],
      [],
      ['Categoria', 'Ingrediente', 'Quantidade', 'Unidade'],
    ]
    for (const item of semPreco) {
      rows2.push([item.categoria, item.nome, item.quantidade, item.unidade])
    }
    const ws2 = XLSX.utils.aoa_to_sheet(rows2)
    ws2['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 12 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Sem Preço')
  }

  // ── Sheet 3: Extras manuais ───────────────────────────────────────────────
  if (extras.length > 0) {
    const totalExtras = extras.reduce((s, e) => s + (e.preco_unit ?? 0), 0)
    const rows3: (string | number | null)[][] = [
      ['Categoria', 'Nome', 'Total (€)', 'Notas'],
    ]
    for (const item of extras) {
      rows3.push([item.categoria, item.nome, item.preco_unit ?? null, item.notas ?? null])
    }
    rows3.push([])
    rows3.push(['', 'TOTAL EXTRAS', totalExtras, null])
    const ws3 = XLSX.utils.aoa_to_sheet(rows3)
    ws3['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 28 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Extras')
  }

  // ── Sheet 4: Resumo ───────────────────────────────────────────────────────
  const totalExtrasVal = extras.reduce((s, e) => s + (e.preco_unit ?? 0), 0)
  const totalGeral = totalEstimado + totalExtrasVal

  const rows4: (string | number | null)[][] = [
    ['RESUMO DO ORÇAMENTO'],
    [],
    ['Campo', campo.nome],
    ['Mamã', campo.mama ?? ''],
    [],
    ['Total estimado (alimentação)', totalEstimado],
    ['Total extras', totalExtrasVal],
    ['TOTAL GERAL', totalGeral],
    [],
    totalPrevisto ? ['Orçamento previsto', totalPrevisto] : ['Orçamento previsto', 'Não definido'],
    totalPrevisto ? ['Diferença', totalGeral - totalPrevisto] : [],
    [],
    ['Ingredientes sem preço', semPreco.length],
    ['Ingredientes com preço', comPreco.length],
  ]

  const ws4 = XLSX.utils.aoa_to_sheet(rows4)
  ws4['!cols'] = [{ wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws4, 'Resumo')

  const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  const blob = new Blob([new Uint8Array(raw)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = campo.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]
  await exportOrShareFile(blob, `orcamento-${safeName}-${dateStr}.xlsx`)
}
