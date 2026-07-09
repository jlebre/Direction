import * as XLSX from 'xlsx'
import type { Campo } from '@/types/shared'
import { getDiaLabel } from '@/types/shared'
import { REFEICAO_LABELS, TIPO_PRATO_LABELS, type EmentaItem } from '@/types/mamas'
import { exportOrShareFile } from '@/lib/export-share'

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export async function exportPlanoRefeicoes(campo: Campo, ementa: EmentaItem[], diasList: number[]): Promise<void> {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Plano de Refeições ────────────────────────────────────────────
  const rows: (string | number | null)[][] = [
    ['Campo', campo.nome],
    ['Mamã', campo.mama ?? ''],
    ['Período', campo.datas ?? ''],
    [],
    ['Dia', 'Data', 'Refeição', 'Prato', 'Nome', 'Notas'],
  ]

  // Agrupar por (dia, refeicao)
  const grouped = new Map<string, EmentaItem[]>()
  for (const item of ementa) {
    const key = `${item.dia}-${item.refeicao}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  // Ordenar dias e refeições
  const ordemRefeicao: Record<string, number> = {
    pequeno_almoco: 0,
    almoco: 1,
    lanche: 2,
    jantar: 3,
    ceia: 4,
    extra: 5,
  }

  const entries = [...grouped.entries()].sort(([a], [b]) => {
    const [diaA, refA] = a.split('-')
    const [diaB, refB] = b.split('-')
    const diaOrder = diasList.indexOf(parseInt(diaA)) - diasList.indexOf(parseInt(diaB))
    if (diaOrder !== 0) return diaOrder
    return (ordemRefeicao[refA] ?? 99) - (ordemRefeicao[refB] ?? 99)
  })

  let lastDia: number | null = null
  let lastRefeicao: string | null = null

  for (const [key, pratos] of entries) {
    const [diaStr, refeicao] = key.split('-')
    const dia = parseInt(diaStr)
    const diaLabel = getDiaLabel(dia)

    // Calcular data se disponível
    let dataLabel = ''
    if (campo.data_inicio) {
      const inicio = new Date(campo.data_inicio + 'T00:00:00')
      // dia=1 → dia 0 de offset; dia=-1 → pré-campo -1; etc.
      const offset = dia > 0 ? dia - 1 : dia
      const data = new Date(inicio)
      data.setDate(data.getDate() + offset)
      dataLabel = formatDatePT(data.toISOString().split('T')[0])
    }

    const refeicaoLabel = REFEICAO_LABELS[refeicao as keyof typeof REFEICAO_LABELS] ?? refeicao

    const sortedPratos = [...pratos].sort((a, b) => a.ordem - b.ordem)

    for (let i = 0; i < sortedPratos.length; i++) {
      const prato = sortedPratos[i]
      const nome = prato.receita?.nome ?? prato.receita_nome_custom ?? ''
      const tipoPrato = TIPO_PRATO_LABELS[prato.tipo_prato ?? 'prato']

      rows.push([
        dia !== lastDia ? diaLabel : '',
        dia !== lastDia ? dataLabel : '',
        (dia !== lastDia || refeicao !== lastRefeicao) ? refeicaoLabel : '',
        tipoPrato,
        nome,
        prato.notas ?? '',
      ])

      if (i === 0) {
        lastDia = dia
        lastRefeicao = refeicao
      }
    }
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rows)
  ws1['!cols'] = [
    { wch: 12 },
    { wch: 11 },
    { wch: 18 },
    { wch: 12 },
    { wch: 38 },
    { wch: 28 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, 'Plano de Refeições')

  // ── Sheet 2: Resumo ───────────────────────────────────────────────────────
  const diasComRefeicoes = new Set(ementa.map((e) => e.dia)).size
  const totalPratos = ementa.length
  const totalRefeicoes = grouped.size

  const resumo: (string | number | null)[][] = [
    ['PLANO DE REFEIÇÕES — CAMTIL'],
    [],
    ['Campo', campo.nome],
    ['Mamã', campo.mama ?? ''],
    ['Período', campo.datas ?? ''],
    ['Local', campo.local ?? ''],
    ['Exportado em', formatDatePT(new Date().toISOString().split('T')[0])],
    [],
    ['ESTATÍSTICAS'],
    ['Dias com refeições', diasComRefeicoes],
    ['Total de refeições', totalRefeicoes],
    ['Total de pratos', totalPratos],
  ]

  const ws2 = XLSX.utils.aoa_to_sheet(resumo)
  ws2['!cols'] = [{ wch: 22 }, { wch: 32 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo')

  // ── Export / Share ────────────────────────────────────────────────────────
  // Não usar .buffer.slice — falha em iOS Safari quando XLSX.write devolve Array<number>.
  const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  const blob = new Blob([new Uint8Array(raw)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = campo.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]
  await exportOrShareFile(blob, `plano-refeicoes-${safeName}-${dateStr}.xlsx`)
}
