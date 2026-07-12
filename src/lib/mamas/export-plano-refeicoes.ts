import * as XLSX from 'xlsx'
import type { Campo } from '@/types/shared'
import { getDiaLabel, getSeccao } from '@/types/shared'
import { REFEICAO_LABELS, TIPO_PRATO_LABELS, type EmentaItem, type CampoDia, calcularQuantidade } from '@/types/mamas'
import { exportOrShareFile } from '@/lib/export-share'

type RiExport = {
  ingrediente_id: string
  quantidade_mosquitos: number | null
  quantidade_aranh_melgas: number | null
  quantidade_cam_trem: number | null
  unidade: string
  ingrediente?: { nome: string; categoria_supermercado?: string | null } | null
}

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getDiaLabelCustom(dia: number, campoDias: CampoDia[]): string {
  return campoDias.find((d) => d.ordem === dia)?.nome ?? getDiaLabel(dia)
}

export async function exportPlanoRefeicoes(
  campo: Campo,
  ementa: EmentaItem[],
  diasList: number[],
  campoDias: CampoDia[] = []
): Promise<void> {
  const wb = XLSX.utils.book_new()
  const numPessoasCampo = (campo.num_animados ?? 0) + (campo.num_animadores ?? 0) || null

  // ── Sheet 1: Plano de Refeições ────────────────────────────────────────────
  const rows: (string | number | null)[][] = [
    ['Campo', campo.nome],
    ['Mamã', campo.mama ?? ''],
    ['Período', campo.datas ?? ''],
    [],
    ['Dia', 'Data', 'Refeição', 'Prato', 'Nome', 'Notas', 'Nº Pessoas'],
  ]

  // Agrupar por (dia, refeicao)
  const grouped = new Map<string, EmentaItem[]>()
  for (const item of ementa) {
    const key = `${item.dia}-${item.refeicao}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  const ordemRefeicao: Record<string, number> = {
    pequeno_almoco: 0, almoco: 1, lanche: 2, jantar: 3, ceia: 4, extra: 5,
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
    const diaLabel = getDiaLabelCustom(dia, campoDias)

    let dataLabel = ''
    if (campo.data_inicio) {
      const inicio = new Date(campo.data_inicio + 'T00:00:00')
      const offset = dia > 0 ? dia - 1 : dia
      const data = new Date(inicio)
      data.setDate(data.getDate() + offset)
      dataLabel = formatDatePT(data.toISOString().split('T')[0])
    }

    const refeicaoLabel = REFEICAO_LABELS[refeicao as keyof typeof REFEICAO_LABELS] ?? refeicao
    // num_pessoas for this slot (take first non-null in the group)
    const slotNumPessoas = pratos.find((p) => p.num_pessoas != null)?.num_pessoas ?? null
    const numPessoasLabel: string | number | null =
      slotNumPessoas !== null && slotNumPessoas !== numPessoasCampo
        ? slotNumPessoas
        : (slotNumPessoas !== null ? slotNumPessoas : null)

    const sortedPratos = [...pratos].sort((a, b) => a.ordem - b.ordem)

    for (let i = 0; i < sortedPratos.length; i++) {
      const prato = sortedPratos[i]
      const nome = prato.receita?.nome ?? prato.receita_nome_custom ?? ''
      const tipoPrato = TIPO_PRATO_LABELS[prato.tipo_prato ?? 'prato']
      const isNewSlot = dia !== lastDia || refeicao !== lastRefeicao

      rows.push([
        dia !== lastDia ? diaLabel : '',
        dia !== lastDia ? dataLabel : '',
        isNewSlot ? refeicaoLabel : '',
        tipoPrato,
        nome,
        prato.notas ?? '',
        // Show num_pessoas on the first row of each (dia, refeicao) group
        (i === 0 && isNewSlot && numPessoasLabel !== null) ? numPessoasLabel : '',
      ])

      if (i === 0) {
        lastDia = dia
        lastRefeicao = refeicao
      }
    }
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rows)
  ws1['!cols'] = [
    { wch: 14 },
    { wch: 11 },
    { wch: 18 },
    { wch: 12 },
    { wch: 38 },
    { wch: 28 },
    { wch: 11 },
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

  if (campoDias.length > 0) {
    resumo.push([])
    resumo.push(['DIAS PERSONALIZADOS'])
    for (const d of campoDias.filter((d) => d.ativo).sort((a, b) => a.ordem - b.ordem)) {
      resumo.push([`Dia ${d.ordem}`, d.nome ?? getDiaLabel(d.ordem), d.data ?? ''])
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(resumo)
  ws2['!cols'] = [{ wch: 22 }, { wch: 32 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo')

  // ── Sheet 3: Ingredientes calculados ─────────────────────────────────────
  const seccao = getSeccao(campo)
  const numPessoas = (campo.num_animados ?? 0) + (campo.num_animadores ?? 0) || 58

  const agregados = new Map<string, { nome: string; categoria: string; qty: number; unidade: string }>()

  for (const slot of ementa) {
    const slotPessoas = slot.num_pessoas ?? numPessoas
    const ris = (slot.receita as unknown as { receita_ingredientes?: RiExport[] })?.receita_ingredientes ?? []
    for (const ri of ris) {
      if (!ri.ingrediente?.nome) continue
      const qty = calcularQuantidade(
        seccao,
        ri.quantidade_mosquitos,
        ri.quantidade_aranh_melgas,
        ri.quantidade_cam_trem,
        slotPessoas,
        58
      )
      if (!qty) continue
      const key = ri.ingrediente_id
      const existing = agregados.get(key)
      if (existing) {
        existing.qty += qty
      } else {
        agregados.set(key, {
          nome: ri.ingrediente.nome,
          categoria: ri.ingrediente.categoria_supermercado ?? 'outro',
          qty,
          unidade: ri.unidade,
        })
      }
    }
  }

  if (agregados.size > 0) {
    const ing3: (string | number)[][] = [
      [`Ingredientes — ${campo.nome}`, '', '', ''],
      [`Calculados para ${numPessoas} pessoas (seccão: ${seccao})`, '', '', ''],
      [],
      ['Categoria', 'Ingrediente', 'Quantidade', 'Unidade'],
    ]
    for (const [, item] of [...agregados.entries()].sort(([, a], [, b]) =>
      a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome)
    )) {
      ing3.push([item.categoria, item.nome, Math.ceil(item.qty * 100) / 100, item.unidade])
    }
    const ws3 = XLSX.utils.aoa_to_sheet(ing3)
    ws3['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Ingredientes')
  }

  // ── Export / Share ────────────────────────────────────────────────────────
  const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  const blob = new Blob([new Uint8Array(raw)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = campo.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]
  await exportOrShareFile(blob, `plano-refeicoes-${safeName}-${dateStr}.xlsx`)
}
