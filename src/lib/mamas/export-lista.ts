import * as XLSX from 'xlsx'
import type { Campo } from '@/types/shared'
import { ZONA_LABELS } from '@/types/mamas'
import type { ListaComprasItem, ZonaSupermercado } from '@/types/mamas'
import { exportOrShareFile } from '@/lib/export-share'
import { formatQuantidade } from '@/lib/utils'

function formatCurrencyPT(n: number) {
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

// ── Excel ────────────────────────────────────────────────────────────────────

export async function exportListaExcel(campo: Campo, items: ListaComprasItem[]): Promise<void> {
  const wb = XLSX.utils.book_new()
  const hoje = new Date().toISOString().split('T')[0]

  // ── Sheet 1: Lista ───────────────────────────────────────────────────────
  const rows: (string | number | null)[][] = [
    [`Lista de Compras — ${campo.nome}`, '', '', '', '', ''],
    [`Data: ${hoje.split('-').reverse().join('/')}`, '', '', '', '', ''],
    [],
    ['Zona', 'Ingrediente', 'Quantidade', 'Unidade', 'Preço ref. (€)', 'Comprado'],
  ]

  // Agrupa por zona
  const porZona = new Map<string, ListaComprasItem[]>()
  for (const item of items) {
    const zona = item.zona_supermercado ?? 'outro'
    if (!porZona.has(zona)) porZona.set(zona, [])
    porZona.get(zona)!.push(item)
  }

  let totalPrevisto = 0
  const semPreco: string[] = []

  for (const [zona, zonaItems] of porZona) {
    const zonaLabel = ZONA_LABELS[zona as ZonaSupermercado] ?? zona
    for (const item of zonaItems) {
      const nome = item.ingrediente?.nome ?? item.nome_custom ?? '?'
      rows.push([
        zonaLabel,
        nome,
        item.quantidade,
        item.unidade,
        item.preco_estimado ?? null,
        item.comprado ? 'Sim' : '',
      ])
      if (item.preco_estimado) totalPrevisto += item.preco_estimado
      else semPreco.push(nome)
    }
  }

  rows.push([])
  rows.push(['Total previsto', '', '', '', totalPrevisto > 0 ? totalPrevisto : null, ''])

  const ws1 = XLSX.utils.aoa_to_sheet(rows)
  ws1['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 9 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Lista de Compras')

  // ── Sheet 2: Sem preço ───────────────────────────────────────────────────
  if (semPreco.length > 0) {
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Ingredientes sem preço de referência'],
      [],
      ['Ingrediente'],
      ...semPreco.map((n) => [n]),
    ])
    ws2['!cols'] = [{ wch: 34 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Sem Preço')
  }

  // ── Sheet 3: Resumo ──────────────────────────────────────────────────────
  const comprados = items.filter((i) => i.comprado).length
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['RESUMO — LISTA DE COMPRAS'],
    [],
    ['Campo', campo.nome],
    ['Data', hoje.split('-').reverse().join('/')],
    [],
    ['Total de itens', items.length],
    ['Itens comprados', comprados],
    ['Itens por comprar', items.length - comprados],
    ['Itens sem preço', semPreco.length],
    ['Total previsto', totalPrevisto > 0 ? totalPrevisto : '—'],
  ])
  ws3['!cols'] = [{ wch: 20 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Resumo')

  const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  const blob = new Blob([new Uint8Array(raw)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = campo.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase()
  await exportOrShareFile(blob, `lista-compras-${safeName}-${hoje}.xlsx`)
}

// ── PDF (via janela de impressão) ────────────────────────────────────────────

export function imprimirLista(campo: Campo, items: ListaComprasItem[]): void {
  const hoje = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const totalPrevisto = items.reduce((s, i) => s + (i.preco_estimado ?? 0), 0)

  const porZona = new Map<string, ListaComprasItem[]>()
  for (const item of items) {
    const zona = item.zona_supermercado ?? 'outro'
    if (!porZona.has(zona)) porZona.set(zona, [])
    porZona.get(zona)!.push(item)
  }

  const secoes = Array.from(porZona.entries()).map(([zona, zonaItems]) => {
    const zonaLabel = ZONA_LABELS[zona as ZonaSupermercado] ?? zona
    const linhas = zonaItems.map((item) => {
      const nome = item.ingrediente?.nome ?? item.nome_custom ?? '?'
      const qty = formatQuantidade(item.quantidade, item.unidade)
      const preco = item.preco_estimado ? formatCurrencyPT(item.preco_estimado) : '—'
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">
          <input type="checkbox" ${item.comprado ? 'checked' : ''} style="margin-right:6px;width:14px;height:14px;">
          <span style="${item.comprado ? 'text-decoration:line-through;color:#999' : ''}">${nome}</span>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${qty}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;color:#666;white-space:nowrap">${preco}</td>
      </tr>`
    }).join('')
    return `
      <tr style="background:#f3f4f6">
        <td colspan="3" style="padding:6px 8px;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555">${zonaLabel}</td>
      </tr>
      ${linhas}`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Lista de Compras — ${campo.nome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 16px; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 2px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #333; font-size: 11px; text-transform: uppercase; }
    th:last-child, th:nth-child(2) { text-align: right; }
    .total { margin-top: 8px; text-align: right; font-weight: bold; }
    @media print { body { padding: 8px; } button { display: none !important; } }
  </style>
</head>
<body>
  <h1>Lista de Compras</h1>
  <p class="meta">${campo.nome} · ${hoje} · ${items.length} itens${totalPrevisto > 0 ? ' · Total previsto: ' + formatCurrencyPT(totalPrevisto) : ''}</p>
  <table>
    <thead><tr>
      <th>Ingrediente</th>
      <th style="text-align:right">Qtd</th>
      <th style="text-align:right">Preço ref.</th>
    </tr></thead>
    <tbody>${secoes}</tbody>
  </table>
  ${totalPrevisto > 0 ? `<p class="total">Total previsto: ${formatCurrencyPT(totalPrevisto)}</p>` : ''}
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
