import * as XLSX from 'xlsx'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif, DespesaLinha } from '@/types/adjuntos'
import { CODE_CATEGORIES } from './codes'
import { VALORES_REF_VERAO } from './valores-referencia'

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getFilenameFromPath(path: string | null): string {
  if (!path) return ''
  return path.split('/').pop() ?? ''
}

// Aplica número format a células numéricas numa coluna
function applyNumFmt(
  ws: XLSX.WorkSheet,
  col: number,
  rowStart: number,
  rowEnd: number,
  fmt: string
) {
  for (let row = rowStart; row <= rowEnd; row++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: col })
    if (ws[addr] && ws[addr].t === 'n') {
      ws[addr].z = fmt
    }
  }
}

export function generateExcelBuffer(
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = [],
  despesaLinhas: DespesaLinha[] = []
): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const sorted = [...despesas].sort((a, b) => a.numero_recibo - b.numero_recibo)

  // Faturas de regularização NIF não contam para saldo (mesmo dinheiro formalizado)
  const despesasFinanceiras = sorted.filter((d) => !d.is_regularizacao_nif)
  const despesasList = despesasFinanceiras.filter((d) => d.tipo === 'despesa')
  const receitasList = despesasFinanceiras.filter((d) => d.tipo === 'receita')

  const totalDespesas = despesasList.reduce((s, d) => s + Number(d.valor), 0)
  const totalReceitas = receitasList.reduce((s, d) => s + Number(d.valor), 0)

  // Bolsa NIF: faturas sem NIF originais + estado de regularização
  const faturasSemNIF = despesasList.filter((d) => !d.nif_confirmado)
  const totalSemNIF = faturasSemNIF.reduce((s, d) => s + Number(d.valor), 0)
  const totalRegularizado = regularizacoes.reduce((s, r) => s + Number(r.valor), 0)
  const emAberto = Math.max(0, totalSemNIF - totalRegularizado)

  const totalComNIF = despesasList.filter((d) => d.nif_confirmado).reduce((s, d) => s + Number(d.valor), 0)
  const saldoDisponivel = campo.saldo_inicial + totalReceitas - totalDespesas

  // ── Sheet 1: Faturas ──────────────────────────────────────────────────────
  const rows: (string | number | null)[][] = [
    ['Recibo', 'Data', 'Descrição', 'Código', 'Categoria', 'Valor (€)', 'NIF', 'Reg. NIF', 'Tem Foto', 'Ficheiro Imagem'],
  ]

  for (const d of sorted) {
    if (d.tipo === 'receita') continue
    rows.push([
      d.numero_recibo,
      formatDatePT(d.data),
      d.descricao ?? '',
      d.codigo,
      d.codigo_descricao,
      Number(d.valor),
      d.nif_confirmado ? 'Sim' : 'Não',
      d.is_regularizacao_nif ? 'Fatura reg.' : '',
      d.foto_path ? 'Sim' : 'Não',
      getFilenameFromPath(d.foto_path),
    ])
  }

  // Linha em branco + totalizadores
  rows.push([])
  rows.push(['', '', '', '', 'Total Despesas', totalDespesas, '', '', '', ''])
  rows.push(['', '', '', '', 'Total com NIF', totalComNIF, '', '', '', ''])
  rows.push(['', '', '', '', 'Total sem NIF', totalSemNIF, '', '', '', ''])
  rows.push(['', '', '', '', 'Bolsa NIF em aberto', emAberto, '', '', '', ''])
  rows.push(['', '', '', '', 'Orçamento Inicial', campo.saldo_inicial, '', '', '', ''])
  rows.push(['', '', '', '', 'Receitas Extra', totalReceitas, '', '', '', ''])
  rows.push(['', '', '', '', 'Saldo Disponível', saldoDisponivel, '', '', '', ''])

  const ws1 = XLSX.utils.aoa_to_sheet(rows)
  ws1['!cols'] = [
    { wch: 8 },
    { wch: 11 },
    { wch: 38 },
    { wch: 8 },
    { wch: 35 },
    { wch: 13 },
    { wch: 6 },
    { wch: 11 },
    { wch: 9 },
    { wch: 20 },
  ]
  applyNumFmt(ws1, 5, 1, rows.length - 1, '#,##0.00')
  XLSX.utils.book_append_sheet(wb, ws1, 'Faturas')

  // ── Sheet 2: Orçamento ────────────────────────────────────────────────────
  const porCodigo: Record<string, number> = {}
  for (const d of despesasList.filter((d) => !d.is_regularizacao_nif)) {
    porCodigo[d.codigo] = (porCodigo[d.codigo] ?? 0) + Number(d.valor)
  }

  const allCodes = CODE_CATEGORIES.flatMap((cat) => cat.codes)
  const refTable = VALORES_REF_VERAO[campo.escalao] ?? {}

  const orcRows: (string | number | null)[][] = [
    ['Campo', campo.nome],
    ['Escalão', campo.escalao],
    ['Datas', campo.datas],
    ['Local', campo.local ?? ''],
    ['Pré-campo', campo.pre_campo ?? ''],
    ['Diretor/a', campo.diretor],
    ['Adjunto/a', campo.adjunto],
    ['Mamã', campo.mama],
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
  const orcDataStart = 10 // linha após o cabeçalho da tabela de códigos
  applyNumFmt(ws2, 2, orcDataStart, orcRows.length - 1, '#,##0.00')
  applyNumFmt(ws2, 3, orcDataStart, orcRows.length - 1, '#,##0.00')
  applyNumFmt(ws2, 4, orcDataStart, orcRows.length - 1, '#,##0.00')
  XLSX.utils.book_append_sheet(wb, ws2, 'Orçamento')

  // ── Sheet 3: Resumo ───────────────────────────────────────────────────────
  const now = new Date()
  const dataExport = formatDatePT(now.toISOString().split('T')[0])

  const resumoRows: (string | number | null)[][] = [
    ['RELATÓRIO FINANCEIRO — CAMTIL 2026'],
    [],
    ['Campo', campo.nome],
    ['Escalão', campo.escalao],
    ['Datas', campo.datas],
    ['Local', campo.local ?? ''],
    ['Diretor/a', campo.diretor],
    ['Adjunto/a', campo.adjunto],
    ['Mamã', campo.mama],
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

  const ws3 = XLSX.utils.aoa_to_sheet(resumoRows)
  ws3['!cols'] = [{ wch: 22 }, { wch: 28 }]
  // Formatar só as células monetárias do resumo (linhas 12-15 e 25-27, índice 0)
  for (const row of [12, 13, 14, 15, 25, 26, 27]) {
    const addr = XLSX.utils.encode_cell({ r: row, c: 1 })
    if (ws3[addr] && ws3[addr].t === 'n') ws3[addr].z = '#,##0.00'
  }
  XLSX.utils.book_append_sheet(wb, ws3, 'Resumo')

  // ── Sheet 4: Produtos OCR (só se houver linhas confirmadas/corrigidas) ────────
  const linhasValidadas = despesaLinhas.filter(
    (l) => l.estado === 'confirmado' || l.estado === 'corrigido'
  )
  if (linhasValidadas.length > 0) {
    const produtosRows: (string | number | null)[][] = [
      ['Recibo', 'Fornecedor', 'Data', 'Produto', 'Qtd', 'Unidade', '€/un', 'Total (€)', 'Estado', 'Tipo', 'Categoria'],
    ]
    for (const linha of linhasValidadas) {
      const d = sorted.find((ds) => ds.id === linha.despesa_id)
      produtosRows.push([
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
    const ws4 = XLSX.utils.aoa_to_sheet(produtosRows)
    ws4['!cols'] = [
      { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 30 },
      { wch: 7 }, { wch: 7 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    ]
    applyNumFmt(ws4, 4, 1, produtosRows.length - 1, '#,##0.000')
    applyNumFmt(ws4, 6, 1, produtosRows.length - 1, '#,##0.00')
    applyNumFmt(ws4, 7, 1, produtosRows.length - 1, '#,##0.00')
    XLSX.utils.book_append_sheet(wb, ws4, 'Produtos OCR')
  }

  const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

export async function generateExcel(
  campo: Campo,
  despesas: Despesa[],
  regularizacoes: RegularizacaoNif[] = [],
  despesaLinhas: DespesaLinha[] = []
): Promise<void> {
  const buffer = generateExcelBuffer(campo, despesas, regularizacoes, despesaLinhas)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const { exportOrShareFile } = await import('@/lib/export-share')
  const filename = `CAMTIL_${campo.nome.replace(/\s/g, '_')}_Contas.xlsx`
  await exportOrShareFile(blob, filename)
}
