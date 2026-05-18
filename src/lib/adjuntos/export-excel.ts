import * as XLSX from 'xlsx'
import type { Campo } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'
import { CODE_CATEGORIES } from './codes'
import { VALORES_REF_VERAO } from './valores-referencia'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function generateExcel(campo: Campo, despesas: Despesa[]): void {
  const wb = XLSX.utils.book_new()
  const sorted = [...despesas].sort((a, b) => a.numero_recibo - b.numero_recibo)
  const totalDespesas = sorted.filter((d) => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor), 0)
  const totalReceitas = sorted.filter((d) => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor), 0)
  const disponivel = campo.saldo_inicial + totalReceitas - totalDespesas

  // ── Sheet 1: Relatório & Contas ──────────────────────────────────────────
  const rows: (string | number | null)[][] = []
  rows.push(['Disponível', 'Total Receita', 'Gasto'])
  rows.push([disponivel, campo.saldo_inicial + totalReceitas, totalDespesas])
  rows.push([])
  rows.push(['Data', 'Nº Recibo', 'Receitas', 'Despesas', 'Descrição', 'Código', 'Descrição Cód.'])
  rows.push([null, null, campo.saldo_inicial, null, 'Orçamento de Campo', null, null])

  for (const d of sorted) {
    rows.push([
      formatDate(d.data),
      d.numero_recibo,
      d.tipo === 'receita' ? Number(d.valor) : null,
      d.tipo === 'despesa' ? Number(d.valor) : null,
      d.descricao,
      d.codigo,
      d.codigo_descricao,
    ])
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rows)
  ws1['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 8 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Relatório & Contas')

  // ── Sheet 2: Dados Iniciais ───────────────────────────────────────────────
  const allCodes = CODE_CATEGORIES.flatMap((cat) => cat.codes)
  const porCodigo: Record<string, number> = {}
  for (const d of sorted.filter((d) => d.tipo === 'despesa')) {
    porCodigo[d.codigo] = (porCodigo[d.codigo] ?? 0) + Number(d.valor)
  }

  const info: (string | number | null)[][] = [
    ['Campo', campo.nome],
    ['Escalão', campo.escalao],
    ['Datas', campo.datas],
    ['Local', campo.local ?? ''],
    ['Pré-campo', campo.pre_campo ?? ''],
    ['Diretor/a', campo.diretor],
    ['Adjunto/a', campo.adjunto],
    ['Mamã', campo.mama],
    ['Saldo Inicial', campo.saldo_inicial],
    ['Total Despesas', totalDespesas],
    ['Total Receitas Extras', totalReceitas],
    ['Disponível', disponivel],
    [],
    ['Código', 'Descrição', 'Gasto (€)', 'Referência (€)', 'Diferença (€)'],
  ]

  const refTable = VALORES_REF_VERAO[campo.escalao] ?? {}
  for (const c of allCodes) {
    const gasto = porCodigo[c.code] ?? 0
    const ref = refTable[c.code] ?? 0
    info.push([c.code, c.full, gasto, ref, gasto - ref])
  }

  const ws2 = XLSX.utils.aoa_to_sheet(info)
  ws2['!cols'] = [{ wch: 10 }, { wch: 45 }, { wch: 14 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Dados Iniciais')

  XLSX.writeFile(wb, `CAMTIL_${campo.nome.replace(/\s/g, '_')}_Contas.xlsx`)
}
