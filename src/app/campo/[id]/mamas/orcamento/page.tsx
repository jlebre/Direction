import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calculator, ShoppingCart } from 'lucide-react'
import type { Campo } from '@/types/shared'
import { ESCALAO_COR, getDiaLabel, getNumDias, getSeccao } from '@/types/shared'
import { calcularQuantidade, REFEICAO_LABELS } from '@/types/mamas'
import type { OrcamentoItem, EstimativaItem, CampoDia, DiaBreakdown, RefeicaoTipo } from '@/types/mamas'
import { OrcamentoView } from '@/components/mamas/orcamento/OrcamentoView'

export const dynamic = 'force-dynamic'

type RiRow = {
  ingrediente_id: string
  quantidade_mosquitos: number | null
  quantidade_aranh_melgas: number | null
  quantidade_cam_trem: number | null
  unidade: string
  ingrediente: { id: string; nome: string; categoria_supermercado: string } | null
}

type PrecoRow = { item: string; preco: number | null }
type PrecoComRow = { produto: string; preco: number | null; ingrediente_id: string | null }

function encontrarPreco(nome: string, precos: PrecoRow[]): number | null {
  const lower = nome.toLowerCase().trim()
  const exact = precos.find((p) => p.item.toLowerCase().trim() === lower)
  if (exact?.preco) return exact.preco
  const partial = precos.find((p) => {
    const pl = p.item.toLowerCase().trim()
    return pl.includes(lower) || lower.includes(pl)
  })
  return partial?.preco ?? null
}

function resolverPreco(
  ingredienteId: string,
  nome: string,
  precosCom: PrecoComRow[],
  campoPrecos: PrecoRow[]
): number | null {
  const fk = precosCom.find((p) => p.ingrediente_id === ingredienteId && p.preco != null)
  if (fk) return fk.preco

  const lower = nome.toLowerCase().trim()
  const nomeExato = precosCom.find((p) => p.produto.toLowerCase().trim() === lower && p.preco != null)
  if (nomeExato) return nomeExato.preco

  const nomeParcial = precosCom.find((p) => {
    const pl = p.produto.toLowerCase().trim()
    return p.preco != null && (pl.includes(lower) || lower.includes(pl))
  })
  if (nomeParcial) return nomeParcial.preco

  return encontrarPreco(nome, campoPrecos)
}

const REFEICAO_ORDEM: Record<string, number> = {
  pequeno_almoco: 0, almoco: 1, lanche: 2, jantar: 3, ceia: 4, extra: 5,
}

export default async function OrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const { data: campo } = await supabase.from('campos').select('*').eq('id', id).single()
  if (!campo) notFound()

  const c = campo as Campo
  const cor = ESCALAO_COR[c.escalao] ?? { bg: '#2D5016', text: '#1a3009', light: '#E7F3DD', border: '#86efac' }

  const [
    { data: ementaRaw },
    { data: precosCampo },
    { data: precosRef },
    { data: precosCom },
    { data: multData },
    { data: extrasRaw },
    { data: despesasAlim },
    { data: campoDiasData },
  ] = await Promise.all([
    supabase
      .from('ementa')
      .select(`
        id, dia, refeicao, tipo_prato, num_pessoas, is_alternativa, num_animados, num_animadores,
        receita:receitas(
          id, nome,
          receita_ingredientes(
            ingrediente_id,
            quantidade_mosquitos,
            quantidade_aranh_melgas,
            quantidade_cam_trem,
            unidade,
            ingrediente:ingredientes(id, nome, categoria_supermercado)
          )
        )
      `)
      .eq('campo_id', id),
    supabase.from('campo_precos').select('item, preco').eq('campo_id', id),
    supabase.from('campo_precos').select('item, preco').is('campo_id', null),
    supabase.from('precos').select('produto, preco, ingrediente_id').is('deleted_at', null),
    supabase.from('escalao_multiplicadores').select('multiplicador').eq('escalao', c.escalao).maybeSingle(),
    supabase.from('orcamento_itens').select('*').eq('campo_id', id).order('categoria').order('created_at'),
    supabase.from('despesas').select('codigo, codigo_descricao, valor').eq('campo_id', id).eq('tipo', 'despesa').like('codigo', '3.1.%'),
    supabase.from('campo_dias').select('id, campo_id, ordem, nome, data, tipo, ativo').eq('campo_id', id).eq('ativo', true).order('ordem'),
  ])

  const mult = (multData as { multiplicador: number } | null)?.multiplicador ?? 1.0
  const seccao = getSeccao(c)
  const numPessoasCampo = (c.num_animados ?? 0) + (c.num_animadores ?? 0) || 58

  const precosCombinados: PrecoRow[] = [
    ...((precosCampo ?? []) as PrecoRow[]),
    ...((precosRef ?? []) as PrecoRow[]),
  ]
  const precosComunitarios = (precosCom ?? []) as PrecoComRow[]
  const campoDias = (campoDiasData ?? []) as CampoDia[]

  // Compute diasOrdemList for sorting the breakdown
  const numDias = getNumDias(c.seccao)
  const diasOrdemList: number[] = campoDias.length > 0
    ? campoDias.map((d) => d.ordem)
    : [-2, -1, ...Array.from({ length: numDias }, (_, i) => i + 1)]

  // Single pass: build global aggregation + per-slot aggregation
  const agregados = new Map<string, EstimativaItem>()
  const slotsMap = new Map<string, {
    dia: number
    refeicao: string
    numPessoas: number | null
    ingredAgg: Map<string, EstimativaItem>
  }>()

  for (const slot of ementaRaw ?? []) {
    const s = slot as unknown as {
      dia: number; refeicao: string; num_pessoas?: number | null
      is_alternativa?: boolean; num_animados?: number | null; num_animadores?: number | null
      receita: { receita_ingredientes?: RiRow[] } | null
    }

    const pessoasAlt = (s.num_animados ?? 0) + (s.num_animadores ?? 0)
    const slotNumPessoas = (s.is_alternativa && pessoasAlt > 0)
      ? pessoasAlt
      : (s.num_pessoas ?? numPessoasCampo)
    const slotKey = `${s.dia}-${s.refeicao}`

    if (!slotsMap.has(slotKey)) {
      slotsMap.set(slotKey, {
        dia: s.dia,
        refeicao: s.refeicao,
        numPessoas: s.num_pessoas ?? null,
        ingredAgg: new Map(),
      })
    }

    const receita = s.receita
    if (!receita?.receita_ingredientes) continue

    for (const ri of receita.receita_ingredientes) {
      if (!ri.ingrediente) continue

      const qty = calcularQuantidade(
        seccao, ri.quantidade_mosquitos, ri.quantidade_aranh_melgas, ri.quantidade_cam_trem,
        slotNumPessoas, 58, mult
      )
      if (qty === 0) continue

      const preco = resolverPreco(ri.ingrediente_id, ri.ingrediente.nome, precosComunitarios, precosCombinados)
      const itemTotal = preco !== null ? qty * preco : null

      // Global aggregation
      const existingG = agregados.get(ri.ingrediente_id)
      if (existingG) {
        existingG.quantidade += qty
        if (existingG.total !== null && itemTotal !== null) existingG.total += itemTotal
        else existingG.total = null
      } else {
        agregados.set(ri.ingrediente_id, {
          id: ri.ingrediente_id,
          nome: ri.ingrediente.nome,
          categoria: ri.ingrediente.categoria_supermercado ?? 'outro',
          quantidade: qty,
          unidade: ri.unidade,
          preco,
          total: itemTotal,
        })
      }

      // Per-slot aggregation
      const slotData = slotsMap.get(slotKey)!
      const existingS = slotData.ingredAgg.get(ri.ingrediente_id)
      if (existingS) {
        existingS.quantidade += qty
        if (existingS.total !== null && itemTotal !== null) existingS.total += itemTotal
        else existingS.total = null
      } else {
        slotData.ingredAgg.set(ri.ingrediente_id, {
          id: ri.ingrediente_id,
          nome: ri.ingrediente.nome,
          categoria: ri.ingrediente.categoria_supermercado ?? 'outro',
          quantidade: qty,
          unidade: ri.unidade,
          preco,
          total: itemTotal,
        })
      }
    }
  }

  const estimativas: EstimativaItem[] = Array.from(agregados.values()).sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome)
  )

  // Build diasBreakdown from slotsMap
  const diasMap = new Map<number, { label: string; refeicoes: { refeicao: string; numPessoas: number | null; total: number | null }[] }>()

  for (const [, slotData] of slotsMap) {
    const { dia, refeicao } = slotData
    const ingList = Array.from(slotData.ingredAgg.values())
    const slotTotal: number | null = ingList.length === 0
      ? 0
      : ingList.some((i) => i.total === null)
        ? null
        : ingList.reduce((s, i) => s + (i.total ?? 0), 0)

    if (!diasMap.has(dia)) {
      const campoDia = campoDias.find((d) => d.ordem === dia)
      diasMap.set(dia, { label: campoDia?.nome ?? getDiaLabel(dia), refeicoes: [] })
    }
    diasMap.get(dia)!.refeicoes.push({ refeicao, numPessoas: slotData.numPessoas, total: slotTotal })
  }

  const diasBreakdown: DiaBreakdown[] = [...diasMap.entries()]
    .sort(([a], [b]) => {
      const ia = diasOrdemList.indexOf(a), ib = diasOrdemList.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      return a - b
    })
    .map(([dia, data]) => ({
      dia,
      label: data.label,
      total: data.refeicoes.some((r) => r.total === null)
        ? null
        : data.refeicoes.reduce((s, r) => s + (r.total ?? 0), 0),
      refeicoes: [...data.refeicoes]
        .sort((a, b) => (REFEICAO_ORDEM[a.refeicao] ?? 99) - (REFEICAO_ORDEM[b.refeicao] ?? 99))
        .map((r) => ({
          refeicao: r.refeicao as RefeicaoTipo,
          numPessoas: r.numPessoas,
          total: r.total,
        })),
    }))

  const totalPrevisto =
    (c.orcamento_alimentacao ?? 0) +
    (c.orcamento_compras_gerais ?? 0) +
    (c.orcamento_talho ?? 0) +
    (c.orcamento_pao ?? 0) +
    (c.orcamento_frutas_legumes ?? 0) +
    (c.orcamento_diversos ?? 0)

  type GastoReal = { label: string; real: number; previsto: number }
  const ALIM_CODIGOS: Record<string, { label: string; previsto: number }> = {
    '3.1.1': { label: 'Compras Gerais',    previsto: c.orcamento_compras_gerais ?? 0 },
    '3.1.2': { label: 'Talho',             previsto: c.orcamento_talho ?? 0 },
    '3.1.3': { label: 'Pão',               previsto: c.orcamento_pao ?? 0 },
    '3.1.4': { label: 'Frutas & Legumes',  previsto: c.orcamento_frutas_legumes ?? 0 },
    '3.1.5': { label: 'Diversos',          previsto: c.orcamento_diversos ?? 0 },
  }
  const totaisReais: Record<string, number> = {}
  for (const d of (despesasAlim ?? []) as { codigo: string; valor: number }[]) {
    totaisReais[d.codigo] = (totaisReais[d.codigo] ?? 0) + Number(d.valor)
  }
  const gastosReais: GastoReal[] = Object.entries(ALIM_CODIGOS).map(([cod, meta]) => ({
    label: meta.label,
    real: totaisReais[cod] ?? 0,
    previsto: meta.previsto,
  }))

  return (
    <div className="min-h-screen bg-[#f8f8f4]">
      <div className="text-white px-4 pt-8 pb-6 shrink-0" style={{ backgroundColor: cor.bg }}>
        <div className="max-w-lg mx-auto">
          <Link
            href={`/campo/${id}/mamas`}
            className="flex items-center gap-1 text-sm mb-4"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <ChevronLeft className="h-4 w-4" />
            Plano de Refeições
          </Link>
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Orçamento</h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {c.nome}
            {mult !== 1.0 && (
              <span className="ml-2 text-xs opacity-75">
                · multiplicador {c.escalao}: ×{mult}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <OrcamentoView
          campo={c}
          estimativas={estimativas}
          extrasIniciais={(extrasRaw ?? []) as OrcamentoItem[]}
          corEscalao={cor}
          totalPrevisto={totalPrevisto > 0 ? totalPrevisto : null}
          gastosReais={gastosReais}
          diasBreakdown={diasBreakdown}
        />

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/campo/${id}/mamas`}
            className="flex items-center justify-center gap-2 bg-white border border-[#E7E8D1] rounded-xl p-4 text-sm font-semibold text-[#36454F] hover:border-gray-300 transition-colors"
          >
            Plano de Refeições
          </Link>
          <Link
            href={`/campo/${id}/mamas/lista`}
            className="flex items-center justify-center gap-2 text-white rounded-xl p-4 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: cor.bg }}
          >
            <ShoppingCart className="h-4 w-4" />
            Lista de Compras
          </Link>
        </div>
      </div>
    </div>
  )
}
