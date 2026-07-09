import * as XLSX from 'xlsx'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif, DespesaLinha } from '@/types/adjuntos'
import { CODE_CATEGORIES } from './codes'
import { VALORES_REF_VERAO } from './valores-referencia'

function formatDatePT(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getFilenameFromPath(path: string | null): string {
  if (!path) return ''
  return path.split('/').pop() ?? ''
}

/** Remove acentos e caracteres inválidos para nomes de ficheiro */
function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
}

function applyNumFmt(ws: XLSX.WorkSheet, col: number, rowStart: number, rowEnd: number, fmt: string) {
  for (let row = rowStart; row <= rowEnd; row++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: col })
    if (ws[addr] && ws[addr].t === 'n') ws[addr].z = fmt
  }
}

// ── Gera Uint8Array do workbook ──────────────────────────────────────────────
// IMPORTANTE: não usar .buffer.slice — falha em iOS Safari quando o resultado
// é Array<number> e não Uint8Array. new Uint8Array(raw) funciona em ambos os casos.
export function generateExcelBuffer(
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = [],
  despesaLinhas: DespesaLinha[] = []
): Uint8Array<ArrayBuffer> {
  const wb = XLSX.utils.book_new()
  const sorted = [...despesas].sort((a, b) => a.numero_recibo - b.numero_recibo)

  const despesasFinanceiras = sorted.filter((d) => !d.is_regularizacao_nif)
  const despesasList = despesasFinanceiras.filter((d) => d.tipo === 'despesa')
  const receitasList = despesasFinanceiras.filter((d) => d.tipo === 'receita')

  const totalDespesas = despesasList.reduce((s, d) => s + Number(d.valor), 0)
  const totalReceitas = receitasList.reduce((s, d) => s + Number(d.valor), 0)

  const faturasSemNIF = despesasList.filter((d) => !d.nif_confirmado)
  const totalSemNIF = faturasSemNIF.reduce((s, d) => s + Number(d.valor), 0)
  const totalRegularizado = regularizacoes.reduce((s, r) => s + Number(r.valor), 0)
  const emAberto = Math.max(0, totalSemNIF - totalRegularizado)
  const totalComNIF = despesasList.filter((d) => d.nif_confirmado).reduce((s, d) => s + Number(d.valor), 0)
  const saldoDisponivel = campo.saldo_inicial + totalReceitas - totalDespesas

  const now = new Date()
  const dataExport = formatDatePT(now.toISOString().split('T')[0])

  // ── Sheet 1: Resumo ──────────────────────────────────────────────────────
  const resumoRows: (string | number | null)[][] = [
    ['RELATÓRIO FINANCEIRO — CAMTIL 2026'],
    [],
    ['Campo', campo.nome],
    ['Escalão', campo.escalao],
    ['Datas', campo.datas ?? ''],
    ['Local', campo.local ?? ''],
    ['Pré-campo', campo.pre_campo ?? ''],
    ['Diretor/a', campo.diretor ?? ''],
    ['Adjunto/a', campo.adjunto ?? ''],
    ['Mamã', campo.mama ?? ''],
    ['Exportado em', dataExport],
    [],
    ['FINANCEIRO'],
    ['Orçamento inicial', campo.saldo_inicial],
    ['Receitas extra', totalReceitas],
    ['Total despesas', totalDespesas],
    ['Saldo disponível', saldoDisponivel],
    [],
    ['FATURAS'],
    ['Total registadas', despesasList.length],
    ['Com NIF', despesasList.filter((d) => d.nif_confirmado).length],
    ['Sem NIF', despesasList.filter((d) => !d.nif_confirmado).length],
    ['Com imagem', despesasList.filter((d) => d.foto_path).length],
    ['Sem imagem', despesasList.filter((d) => !d.foto_path).length],
    [],
    ['BOLSA NIF'],
    ['Total sem NIF (€)', totalSemNIF],
    ['Regularizado (€)', totalRegularizado],
    ['Por regularizar (€)', emAberto],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(resumoRows)
  ws1['!cols'] = [{ wch: 24 }, { wch: 30 }]
  for (const rowIdx of [13, 14, 15, 16, 26, 27, 28]) {
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c: 1 })
    if (ws1[addr] && ws1[addr].t === 'n') ws1[addr].z = '#,##0.00'
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo')

  // ── Sheet 2: Orçamento ───────────────────────────────────────────────────
  const porCodigo: Record<string, number> = {}
  for (const d of despesasList.filter((d) => !d.is_regularizacao_nif)) {
    porCodigo[d.codigo] = (porCodigo[d.codigo] ?? 0) + Number(d.valor)
  }
  const allCodes = CODE_CATEGORIES.flatMap((cat) => cat.codes)
  const refTable = VALORES_REF_VERAO[campo.escalao] ?? {}

  const orcRows: (string | number | null)[][] = [
    ['Campo', campo.nome],
    ['Escalão', campo.escalao],
    ['Datas', campo.datas ?? ''],
    ['Local', campo.local ?? ''],
    ['Pré-campo', campo.pre_campo ?? ''],
    ['Diretor/a', campo.diretor ?? ''],
    ['Adjunto/a', campo.adjunto ?? ''],
    ['Mamã', campo.mama ?? ''],
    [],
    ['Código', 'Descrição', 'Gasto (€)', 'Referência (€)', 'Diferença (€)'],
  ]
  for (const c of allCodes) {
    const gasto = porCodigo[c.code] ?? 0
    const ref = refTable[c.code] ?? 0
    orcRows.push([c.code, c.full, gasto, ref, gasto - ref])
  }
  const ws2 = XLSX.utils.aoa_to_sheet(orcRows)
  ws2['!cols'] = [{ wch: 10 }, { wch: 45 }, { wch: 14 }, { wch: 16 }, { wch: 16 }]
  applyNumFmt(ws2, 2, 10, orcRows.length - 1, '#,##0.00')
  applyNumFmt(ws2, 3, 10, orcRows.length - 1, '#,##0.00')
  applyNumFmt(ws2, 4, 10, orcRows.length - 1, '#,##0.00')
  XLSX.utils.book_append_sheet(wb, ws2, 'Orçamento')

  // ── Sheet 3: Faturas / Despesas ──────────────────────────────────────────
  const fRows: (string | number | null)[][] = [
    [
      'Recibo', 'Data', 'Descrição', 'Código', 'Categoria', 'Valor (€)',
      'Tem NIF', 'NIF visível', 'NIF Emitente (QR)', 'Origem dados',
      'Fornecedor (OCR)', 'Documento', 'ATCUD', 'QR/OCR', 'Tem imagem', 'Ficheiro imagem',
    ],
  ]
  for (const d of sorted) {
    if (d.tipo === 'receita') continue
    fRows.push([
      d.numero_recibo,
      formatDatePT(d.data),
      d.descricao ?? '',
      d.codigo,
      d.codigo_descricao ?? '',
      Number(d.valor),
      d.nif_confirmado ? 'Sim' : 'Não',
      d.nif_visivel ? 'Sim' : (d.nif_visivel === false ? 'Não' : ''),
      d.qr_nif_emitente ?? '',
      d.origem_dados ?? 'manual',
      d.ocr_fornecedor ?? '',
      d.qr_numero_documento ?? '',
      d.qr_atcud ?? '',
      d.qr_raw ? 'QR' : (d.ocr_status === 'processado' ? 'OCR' : ''),
      d.foto_path ? 'Sim' : 'Não',
      getFilenameFromPath(d.foto_path),
    ])
  }
  fRows.push([])
  fRows.push(['', '', '', '', 'Total Despesas', totalDespesas])
  fRows.push(['', '', '', '', 'Total com NIF', totalComNIF])
  fRows.push(['', '', '', '', 'Total sem NIF', totalSemNIF])
  fRows.push(['', '', '', '', 'Saldo Disponível', saldoDisponivel])

  const ws3 = XLSX.utils.aoa_to_sheet(fRows)
  ws3['!cols'] = [
    { wch: 8 }, { wch: 11 }, { wch: 35 }, { wch: 8 }, { wch: 30 }, { wch: 12 },
    { wch: 9 }, { wch: 10 }, { wch: 16 }, { wch: 10 },
    { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 22 },
  ]
  applyNumFmt(ws3, 5, 1, fRows.length - 1, '#,##0.00')
  XLSX.utils.book_append_sheet(wb, ws3, 'Faturas')

  // ── Sheet 4: Bolsa NIF ───────────────────────────────────────────────────
  if (regularizacoes.length > 0 || faturasSemNIF.length > 0) {
    const nifRows: (string | number | null)[][] = [
      ['Recibo original', 'Data', 'Descrição', 'Valor sem NIF (€)', 'Estado', 'Recibo regularização', 'Valor regularizado (€)', 'Em falta (€)'],
    ]
    for (const orig of faturasSemNIF) {
      const regs = regularizacoes.filter((r) => r.despesa_original_id === orig.id)
      const valorReg = regs.reduce((s, r) => s + Number(r.valor), 0)
      const emFalta = Math.max(0, Number(orig.valor) - valorReg)
      const recibosReg = regs.map((r) => {
        const d = sorted.find((ds) => ds.id === r.despesa_regularizacao_id)
        return d ? String(d.numero_recibo) : ''
      }).filter(Boolean).join(', ')
      nifRows.push([
        orig.numero_recibo,
        formatDatePT(orig.data),
        orig.descricao ?? '',
        Number(orig.valor),
        regs.length > 0 ? (emFalta > 0 ? 'Parcial' : 'Regularizado') : 'Pendente',
        recibosReg || '',
        valorReg > 0 ? valorReg : null,
        emFalta > 0 ? emFalta : null,
      ])
    }
    nifRows.push([])
    nifRows.push(['', '', 'Total sem NIF', totalSemNIF, '', '', totalRegularizado, emAberto])

    const ws4 = XLSX.utils.aoa_to_sheet(nifRows)
    ws4['!cols'] = [
      { wch: 14 }, { wch: 11 }, { wch: 35 }, { wch: 16 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
    ]
    applyNumFmt(ws4, 3, 1, nifRows.length - 1, '#,##0.00')
    applyNumFmt(ws4, 6, 1, nifRows.length - 1, '#,##0.00')
    applyNumFmt(ws4, 7, 1, nifRows.length - 1, '#,##0.00')
    XLSX.utils.book_append_sheet(wb, ws4, 'Bolsa NIF')
  }

  // ── Sheet 5: Produtos OCR ────────────────────────────────────────────────
  const linhasValidadas = despesaLinhas.filter(
    (l) => l.estado === 'confirmado' || l.estado === 'corrigido'
  )
  if (linhasValidadas.length > 0) {
    const prodRows: (string | number | null)[][] = [
      ['Recibo', 'Fornecedor', 'Data', 'Produto', 'Qtd', 'Unidade', '€/un', 'Total (€)', 'Estado', 'Tipo', 'Categoria'],
    ]
    for (const linha of linhasValidadas) {
      const d = sorted.find((ds) => ds.id === linha.despesa_id)
      prodRows.push([
        d?.numero_recibo ?? null,
        d?.ocr_fornecedor ?? '',
        d ? formatDatePT(d.data) : '',
        linha.nome_produto_bruto,
        linha.quantidade ?? null,
        linha.unidade ?? '',
        linha.preco_unitario ?? null,
        linha.preco_total ?? null,
        linha.estado,
        linha.tipo_linha ?? 'produto',
        linha.categoria_linha ?? '',
      ])
    }
    const ws5 = XLSX.utils.aoa_to_sheet(prodRows)
    ws5['!cols'] = [
      { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 30 },
      { wch: 7 }, { wch: 7 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    ]
    applyNumFmt(ws5, 4, 1, prodRows.length - 1, '#,##0.000')
    applyNumFmt(ws5, 6, 1, prodRows.length - 1, '#,##0.00')
    applyNumFmt(ws5, 7, 1, prodRows.length - 1, '#,##0.00')
    XLSX.utils.book_append_sheet(wb, ws5, 'Produtos OCR')
  }

  // ── Gerar buffer seguro para browser + mobile ────────────────────────────
  // XLSX.write com type:'array' devolve Array<number> ou Uint8Array dependendo
  // da versão/plataforma. Casting para number[] garante new Uint8Array<ArrayBuffer>
  // sem depender de .buffer.slice (que falha em iOS quando não é Uint8Array).
  const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  return new Uint8Array(raw) as Uint8Array<ArrayBuffer>
}

export async function generateExcel(
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = [],
  despesaLinhas: DespesaLinha[] = []
): Promise<void> {
  const u8 = generateExcelBuffer(campo, despesas, regularizacoes, despesaLinhas)
  const blob = new Blob([u8], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const { exportOrShareFile } = await import('@/lib/export-share')
  const safeName = sanitizeFilename(campo.nome)
  const dateStr = new Date().toISOString().split('T')[0]
  await exportOrShareFile(blob, `relatorio-contas-${safeName}-${dateStr}.xlsx`)
}
