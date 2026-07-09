'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ShoppingCart, Plus, X, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { Campo } from '@/types/shared'
import {
  type ListaCompras,
  type ListaComprasItem,
  type ZonaSupermercado,
  type ArmazenamentoTipo,
  ZONA_LABELS,
} from '@/types/mamas'
import { cn, formatQuantidade, formatCurrency } from '@/lib/utils'

interface ListaComprasViewProps {
  campo: Campo | null
  listas: ListaCompras[]
  campoId: string
  gerarDia?: number
  gerarRefeicao?: string
}

interface SelecaoItem {
  ingrediente_id: string
  nome: string
  quantidade: number
  unidade: string
  zona: ZonaSupermercado
  selecionado: boolean
}

interface SelecaoState {
  items: SelecaoItem[]
  existingListaId: string | null
}

const UNIDADES = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pç', 'emb', 'dose']
const ZONAS: { value: ZonaSupermercado; label: string }[] = Object.entries(ZONA_LABELS).map(
  ([value, label]) => ({ value: value as ZonaSupermercado, label })
)

export function ListaComprasView({ campo, listas, campoId, gerarDia, gerarRefeicao }: ListaComprasViewProps) {
  const [listasState, setListasState] = useState(listas)
  const [gerandoLista, setGerandoLista] = useState(false)

  // Manual item add sheet
  const [addSheet, setAddSheet] = useState<{ tipo: ArmazenamentoTipo; listaId: string | null } | null>(null)
  const [salvandoManual, setSalvandoManual] = useState(false)

  const supabase = createClient()
  const [selecaoState, setSelecaoState] = useState<SelecaoState | null>(null)
  const [inserindoSelecionados, setInserindoSelecionados] = useState(false)
  const [ordenacao, setOrdenacao] = useState<'zona' | 'alfabetica'>('zona')
  const autoGerarRef = useRef(false)

  const listaDespensa = listasState.find((l) => l.tipo === 'despensa')
  const listaFresco = listasState.find((l) => l.tipo === 'fresco_diario')
  const listaCasaApoio = listasState.find((l) => l.tipo === 'casa_apoio')

  // Vista unificada — todos os itens de todas as listas
  const todosItems: ListaComprasItem[] = [
    ...((listaDespensa?.items ?? []) as ListaComprasItem[]),
    ...((listaFresco?.items ?? []) as ListaComprasItem[]),
    ...((listaCasaApoio?.items ?? []) as ListaComprasItem[]),
  ]

  // Auto-gerar lista filtrada quando chegam via query params
  useEffect(() => {
    if (gerarDia === undefined || autoGerarRef.current) return
    autoGerarRef.current = true
    gerarLista({ dia: gerarDia, refeicao: gerarRefeicao })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!listaDespensa?.id) return
    const channel = supabase
      .channel(`lista-realtime-${campoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lista_compras_items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as ListaComprasItem
            setListasState((prev) =>
              prev.map((lista) =>
                lista.id === newItem.lista_id
                  ? { ...lista, items: [...(lista.items ?? []), newItem] }
                  : lista
              )
            )
          } else if (payload.eventType === 'UPDATE') {
            setListasState((prev) =>
              prev.map((lista) => ({
                ...lista,
                items: lista.items?.map((item) =>
                  item.id === payload.new.id ? { ...item, ...payload.new } : item
                ),
              }))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            setListasState((prev) =>
              prev.map((lista) => ({
                ...lista,
                items: lista.items?.filter((item) => item.id !== deletedId),
              }))
            )
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listaDespensa?.id])

  async function toggleComprado(itemId: string, comprado: boolean) {
    // Optimistic update
    setListasState((prev) =>
      prev.map((lista) => ({
        ...lista,
        items: lista.items?.map((item) =>
          item.id === itemId ? { ...item, comprado } : item
        ),
      }))
    )
    const { error } = await supabase
      .from('lista_compras_items')
      .update({ comprado, comprado_em: comprado ? new Date().toISOString() : null })
      .eq('id', itemId)
    if (error) {
      toast.error('Erro ao atualizar')
      // Revert on error
      setListasState((prev) =>
        prev.map((lista) => ({
          ...lista,
          items: lista.items?.map((item) =>
            item.id === itemId ? { ...item, comprado: !comprado } : item
          ),
        }))
      )
    }
  }

  async function removerItem(itemId: string) {
    setListasState((prev) =>
      prev.map((lista) => ({
        ...lista,
        items: lista.items?.filter((item) => item.id !== itemId),
      }))
    )
    const { error } = await supabase.from('lista_compras_items').delete().eq('id', itemId)
    if (error) {
      toast.error('Erro ao remover item')
      window.location.reload()
    }
  }

  function abrirAddSheet(tipo: ArmazenamentoTipo, listaId: string | null) {
    setAddSheet({ tipo, listaId })
  }

  async function adicionarItem(nome: string, qtd: number, unidade: string, zona: ZonaSupermercado) {
    if (!addSheet) return
    setSalvandoManual(true)
    try {
      let listaId = addSheet.listaId
      if (!listaId) {
        const { data: newLista, error } = await supabase
          .from('lista_compras')
          .insert({ campo_id: campoId, tipo: addSheet.tipo })
          .select()
          .single()
        if (error) throw error
        listaId = newLista.id
        setListasState((prev) => [...prev, { ...newLista, items: [] }])
      }

      const { data: item, error: itemError } = await supabase
        .from('lista_compras_items')
        .insert({
          lista_id: listaId,
          nome_custom: nome.trim(),
          quantidade: qtd,
          unidade,
          zona_supermercado: zona,
          comprado: false,
        })
        .select()
        .single()
      if (itemError) throw itemError

      setListasState((prev) =>
        prev.map((lista) =>
          lista.id === listaId
            ? { ...lista, items: [...(lista.items ?? []), item as ListaComprasItem] }
            : lista
        )
      )
      // Não fechar a sheet — deixar o utilizador adicionar mais itens
      // Atualizar listaId no addSheet para evitar criar nova lista na próxima adição
      setAddSheet((prev) => prev ? { ...prev, listaId: listaId! } : null)
      toast.success('✅ Adicionado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar item')
    } finally {
      setSalvandoManual(false)
    }
  }

  async function gerarLista(filter?: { dia?: number; refeicao?: string }) {
    setGerandoLista(true)
    try {
      let ementaQuery = supabase
        .from('ementa')
        .select('*, receita:receitas(receita_ingredientes(*, ingrediente:ingredientes(*)))')
        .eq('campo_id', campoId)
      if (filter?.dia !== undefined) ementaQuery = ementaQuery.eq('dia', filter.dia)
      if (filter?.refeicao) ementaQuery = ementaQuery.eq('refeicao', filter.refeicao)

      const [{ data: ementa }, { data: fatoresData }] = await Promise.all([
        ementaQuery,
        supabase
          .from('escalao_fatores_quantidade')
          .select('tipo_produto, fator')
          .eq('escalao', campo?.seccao ?? 'melgas'),
      ])

      if (!ementa || ementa.length === 0) {
        toast.info('Adiciona pratos à ementa primeiro')
        return
      }

      // Mapa tipo_produto → fator para este escalão
      const fatoresMap: Record<string, number> = {}
      for (const f of (fatoresData ?? []) as Array<{ tipo_produto: string; fator: number }>) {
        fatoresMap[f.tipo_produto] = f.fator
      }

      const pessoasCampo = campo?.num_animados ?? 58
      const pessoasBase = 58

      const agregados: Record<string, SelecaoItem> = {}

      for (const slot of ementa) {
        const ri = (slot.receita as unknown as { receita_ingredientes?: Array<{
          ingrediente_id: string
          quantidade_mosquitos: number | null
          quantidade_aranh_melgas: number | null
          quantidade_cam_trem: number | null
          unidade: string
          ingrediente?: {
            nome: string
            categoria_supermercado: string
            tipo_armazenamento: string
            tipo_produto?: string
          }
        }> })?.receita_ingredientes ?? []
        for (const item of ri) {
          // Usa quantidade_aranh_melgas como referência base (Melgas = 1.00 em escalao_fatores_quantidade)
          const qtdMelgas = item.quantidade_aranh_melgas ?? item.quantidade_cam_trem ?? item.quantidade_mosquitos
          if (!qtdMelgas) continue
          const tipoProduto = item.ingrediente?.tipo_produto ?? 'outro'
          const fator = fatoresMap[tipoProduto] ?? fatoresMap['outro'] ?? 1.0
          const qty = Math.ceil((qtdMelgas * pessoasCampo * fator) / pessoasBase * 100) / 100
          const key = item.ingrediente_id
          if (agregados[key]) {
            agregados[key].quantidade += qty
          } else {
            agregados[key] = {
              ingrediente_id: item.ingrediente_id,
              nome: item.ingrediente?.nome ?? '?',
              quantidade: qty,
              unidade: item.unidade,
              zona: (item.ingrediente?.categoria_supermercado ?? 'outro') as ZonaSupermercado,
              selecionado: true,
            }
          }
        }
      }

      const items = Object.values(agregados).map((item) => ({
        ...item,
        quantidade: Math.ceil(item.quantidade * 100) / 100,
      }))

      if (items.length === 0) {
        toast.info('Nenhum ingrediente encontrado na ementa')
        return
      }

      // Mostra sheet de seleção antes de inserir
      setSelecaoState({
        items,
        existingListaId: listaDespensa?.id ?? null,
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar lista')
    } finally {
      setGerandoLista(false)
    }
  }

  async function confirmarSelecao(itensSelecionados: SelecaoItem[]) {
    if (!selecaoState) return
    setInserindoSelecionados(true)
    try {
      let listaId: string
      if (selecaoState.existingListaId) {
        listaId = selecaoState.existingListaId
        // Apaga apenas items auto-gerados; preserva manuais (ingrediente_id IS NULL)
        await supabase
          .from('lista_compras_items')
          .delete()
          .eq('lista_id', listaId)
          .not('ingrediente_id', 'is', null)
      } else {
        const { data: lista, error: listaError } = await supabase
          .from('lista_compras')
          .insert({ campo_id: campoId, tipo: 'despensa' })
          .select()
          .single()
        if (listaError) throw listaError
        listaId = lista.id
      }

      const dbItems = itensSelecionados.map((item) => ({
        lista_id: listaId,
        ingrediente_id: item.ingrediente_id,
        quantidade: Math.ceil(item.quantidade * 100) / 100,
        unidade: item.unidade,
        zona_supermercado: item.zona,
        comprado: false,
      }))

      if (dbItems.length > 0) {
        await supabase.from('lista_compras_items').insert(dbItems)
      }

      setSelecaoState(null)
      toast.success(`${dbItems.length} ingredientes adicionados à lista!`)
      window.location.reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar lista')
    } finally {
      setInserindoSelecionados(false)
    }
  }

  function gerarMensagem(): string {
    const allItems = todosItems
    if (allItems.length === 0) return 'Lista de compras vazia.'

    const grupos = new Map<string, { label: string; items: ListaComprasItem[] }>()
    for (const item of allItems) {
      const zona = (item.zona_supermercado ?? 'outro') as ZonaSupermercado
      const label = ZONA_LABELS[zona] ?? 'Outros'
      if (!grupos.has(zona)) grupos.set(zona, { label, items: [] })
      grupos.get(zona)!.items.push(item)
    }

    const hoje = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const linhas = [`🛒 Lista de Compras — ${campo?.nome ?? 'Campo'}`, `📅 ${hoje}`, '']

    for (const [, grupo] of grupos) {
      linhas.push(`📦 ${grupo.label.toUpperCase()}`)
      for (const item of grupo.items) {
        const nome = item.ingrediente?.nome ?? item.nome_custom ?? '?'
        const qty = formatQuantidade(item.quantidade, item.unidade)
        const tick = item.comprado ? '✅' : '☐'
        linhas.push(`${tick} ${nome}: ${qty}`)
      }
      linhas.push('')
    }

    const comprados = allItems.filter((i) => i.comprado).length
    linhas.push(`${comprados}/${allItems.length} itens comprados`)
    return linhas.join('\n')
  }

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(gerarMensagem())
      toast.success('Lista copiada para a área de transferência')
    } catch {
      toast.error('Não foi possível copiar automaticamente')
    }
  }

  if (listasState.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
        <ShoppingCart className="h-16 w-16 text-gray-200" />
        <h2 className="text-xl font-bold text-[#36454F]">Sem lista de compras</h2>
        <p className="text-gray-500 max-w-xs">
          Gera a lista automaticamente a partir da ementa, ou adiciona itens manualmente.
        </p>
        <Button onClick={() => gerarLista()} disabled={gerandoLista} className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          {gerandoLista ? 'A gerar...' : 'Gerar lista de compras'}
        </Button>
        <Button variant="outline" onClick={() => abrirAddSheet('despensa', null)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar item manualmente
        </Button>

        {/* Add sheet */}
        <PresetAddSheet
          aberto={!!addSheet}
          salvando={salvandoManual}
          onClose={() => setAddSheet(null)}
          onAdd={adicionarItem}
        />
        {selecaoState && (
          <GerarListaSelecaoSheet
            state={selecaoState}
            salvando={inserindoSelecionados}
            onConfirm={confirmarSelecao}
            onCancel={() => setSelecaoState(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {todosItems.filter((i) => i.comprado).length} /{' '}
          {todosItems.length} itens comprados
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={copiarMensagem}
            className="flex items-center gap-1.5 text-xs font-medium text-[#36454F] border border-[#E7E8D1] rounded-lg px-2.5 py-1.5 hover:bg-[#f8f8f4] transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </button>
          <Button variant="outline" size="sm" onClick={() => gerarLista()} disabled={gerandoLista}>
            {gerandoLista ? 'A gerar...' : 'Atualizar lista'}
          </Button>
        </div>
      </div>

      {/* Ordenação */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 shrink-0">Ordenar por:</span>
        <button
          onClick={() => setOrdenacao('zona')}
          className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
            ordenacao === 'zona'
              ? 'bg-[#2D5016] text-white border-[#2D5016]'
              : 'text-gray-500 border-gray-200 hover:border-[#2D5016]/40 hover:text-[#2D5016]'
          )}
        >
          Zona
        </button>
        <button
          onClick={() => setOrdenacao('alfabetica')}
          className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
            ordenacao === 'alfabetica'
              ? 'bg-[#2D5016] text-white border-[#2D5016]'
              : 'text-gray-500 border-gray-200 hover:border-[#2D5016]/40 hover:text-[#2D5016]'
          )}
        >
          A–Z
        </button>
      </div>

      <ListaTab
        lista={listaDespensa ? { ...listaDespensa, items: todosItems } : undefined}
        onToggle={toggleComprado}
        onRemove={removerItem}
        onAddManual={() => abrirAddSheet('despensa', listaDespensa?.id ?? null)}
        ordenacao={ordenacao}
      />

      {/* Add item bottom sheet */}
      <PresetAddSheet
        aberto={!!addSheet}
        salvando={salvandoManual}
        onClose={() => setAddSheet(null)}
        onAdd={adicionarItem}
      />
      {selecaoState && (
        <GerarListaSelecaoSheet
          state={selecaoState}
          salvando={inserindoSelecionados}
          onConfirm={confirmarSelecao}
          onCancel={() => setSelecaoState(null)}
        />
      )}
    </div>
  )
}

const PRESETS_LISTA = [
  {
    categoria: "Limpeza", emoji: "🧹",
    items: [
      { nome: "Esfregões", unidade: "un", zona: "limpeza" as const, qtd: 3 },
      { nome: "Esponjas", unidade: "un", zona: "limpeza" as const, qtd: 8 },
      { nome: "Detergente da loiça", unidade: "L", zona: "limpeza" as const, qtd: 2 },
      { nome: "Lixívia", unidade: "L", zona: "limpeza" as const, qtd: 2 },
      { nome: "Papel higiénico", unidade: "rolos", zona: "limpeza" as const, qtd: 100 },
      { nome: "Sacos do lixo", unidade: "emb", zona: "limpeza" as const, qtd: 2 },
      { nome: "Gel desinfetante", unidade: "un", zona: "limpeza" as const, qtd: 1 },
      { nome: "Panos amarelos", unidade: "emb", zona: "limpeza" as const, qtd: 1 },
      { nome: "Rolo papel cozinha", unidade: "emb", zona: "limpeza" as const, qtd: 1 },
      { nome: "Guardanapos", unidade: "pacote", zona: "limpeza" as const, qtd: 3 },
      { nome: "Papel alumínio", unidade: "rolo", zona: "limpeza" as const, qtd: 2 },
      { nome: "Película aderente", unidade: "rolo", zona: "limpeza" as const, qtd: 1 },
      { nome: "Fósforos", unidade: "cx", zona: "limpeza" as const, qtd: 3 },
    ]
  },
  {
    categoria: "Padaria", emoji: "🍞",
    items: [
      { nome: "Pão", unidade: "un", zona: "padaria" as const, qtd: 130 },
      { nome: "Pão-de-forma", unidade: "pacote", zona: "padaria" as const, qtd: 2 },
      { nome: "Pão de cachorro", unidade: "un", zona: "padaria" as const, qtd: 65 },
    ]
  },
  {
    categoria: "Bebidas", emoji: "🥤",
    items: [
      { nome: "Água (garrafão 5L)", unidade: "un", zona: "bebidas_leite" as const, qtd: 10 },
      { nome: "Sumo concentrado", unidade: "garrafa", zona: "bebidas_leite" as const, qtd: 4 },
      { nome: "Cerveja", unidade: "pack 6", zona: "bebidas_leite" as const, qtd: 2 },
      { nome: "Vinho tinto", unidade: "garrafa", zona: "bebidas_leite" as const, qtd: 3 },
    ]
  },
  {
    categoria: "Café e Chá", emoji: "☕",
    items: [
      { nome: "Café moído", unidade: "pacote 250g", zona: "mercearia" as const, qtd: 5 },
      { nome: "Chá camomila", unidade: "cx", zona: "mercearia" as const, qtd: 2 },
      { nome: "Chá tília", unidade: "cx", zona: "mercearia" as const, qtd: 2 },
      { nome: "Açúcar", unidade: "kg", zona: "mercearia" as const, qtd: 2 },
    ]
  },
  {
    categoria: "Snacks / Mimos", emoji: "🍫",
    items: [
      { nome: "Bolachas Maria", unidade: "pacote", zona: "mercearia" as const, qtd: 14 },
      { nome: "Filipinos", unidade: "pacote", zona: "mercearia" as const, qtd: 4 },
      { nome: "Oreos", unidade: "pacote", zona: "mercearia" as const, qtd: 3 },
      { nome: "Rebuçados", unidade: "saco", zona: "mercearia" as const, qtd: 2 },
      { nome: "Pipocas de microondas", unidade: "pacote", zona: "mercearia" as const, qtd: 5 },
      { nome: "Tremoços", unidade: "frasco", zona: "mercearia" as const, qtd: 2 },
      { nome: "Amendoins", unidade: "pacote", zona: "mercearia" as const, qtd: 2 },
      { nome: "Chocolates", unidade: "tablete", zona: "mercearia" as const, qtd: 6 },
    ]
  },
  {
    categoria: "Temperos", emoji: "🧂",
    items: [
      { nome: "Sal grosso", unidade: "saco 2kg", zona: "temperos" as const, qtd: 2 },
      { nome: "Pimenta", unidade: "frasco", zona: "temperos" as const, qtd: 1 },
      { nome: "Orégãos", unidade: "frasco", zona: "temperos" as const, qtd: 2 },
      { nome: "Louro", unidade: "pacote", zona: "temperos" as const, qtd: 1 },
      { nome: "Colorau", unidade: "frasco", zona: "temperos" as const, qtd: 1 },
    ]
  },
]

function PresetAddSheet({
  aberto,
  salvando,
  onClose,
  onAdd,
}: {
  aberto: boolean
  salvando: boolean
  onClose: () => void
  onAdd: (nome: string, qtd: number, unidade: string, zona: ZonaSupermercado) => void
}) {
  const [pesquisa, setPesquisa] = useState('')
  const [libreNome, setLibreNome] = useState('')
  const [libreQtd, setLibreQtd] = useState('1')
  const [libreUnidade, setLibreUnidade] = useState('un')
  const [libreZona, setLibreZona] = useState<ZonaSupermercado>('outro')
  const [adicionados, setAdicionados] = useState<string[]>([])

  if (!aberto) return null

  const query = pesquisa.toLowerCase().trim()
  const filteredCats = PRESETS_LISTA.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => !query || item.nome.toLowerCase().includes(query)),
  })).filter((cat) => cat.items.length > 0)

  function addPreset(item: { nome: string; unidade: string; zona: ZonaSupermercado; qtd: number }) {
    onAdd(item.nome, item.qtd, item.unidade, item.zona)
    setAdicionados((prev) => [...prev, item.nome])
  }

  function addLibre() {
    if (!libreNome.trim()) return
    onAdd(libreNome.trim(), parseFloat(libreQtd) || 1, libreUnidade, libreZona)
    setAdicionados((prev) => [...prev, libreNome.trim()])
    setLibreNome('')
    setLibreQtd('1')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1] shrink-0">
          <div>
            <span className="font-bold text-[#36454F] text-sm">+ Adicionar à lista</span>
            {adicionados.length > 0 && (
              <p className="text-xs text-[#2D5016] font-medium mt-0.5">
                {adicionados.length} {adicionados.length === 1 ? 'item adicionado' : 'itens adicionados'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#2D5016] rounded-lg px-3 py-1.5 hover:bg-[#2D5016]/90 transition-colors"
          >
            {adicionados.length > 0 ? 'Concluir' : <X className="h-4 w-4" />}
          </button>
        </div>
        <div className="px-4 py-2 border-b border-[#E7E8D1] shrink-0">
          <input
            autoFocus
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="🔍 Pesquisar item..."
            className="w-full border border-[#E7E8D1] rounded-xl px-4 py-2.5 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCats.map((cat) => (
            <div key={cat.categoria}>
              <div className="sticky top-0 bg-[#f8f8f4] px-4 py-1.5 border-b border-[#E7E8D1]">
                <span className="text-xs font-bold text-gray-500">{cat.emoji} {cat.categoria}</span>
              </div>
              <div className="divide-y divide-[#E7E8D1]">
                {cat.items.map((item) => (
                  <div key={item.nome} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={cn('flex-1 text-sm', adicionados.includes(item.nome) ? 'text-[#2D5016] font-medium' : 'text-[#36454F]')}>
                      {adicionados.includes(item.nome) && <span className="mr-1">✓</span>}
                      {item.nome}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{item.qtd} {item.unidade}</span>
                    <button
                      onClick={() => addPreset(item)}
                      disabled={salvando}
                      className="w-8 h-8 rounded-full bg-[#2D5016] text-white flex items-center justify-center hover:bg-[#2D5016]/90 transition-colors shrink-0 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div className="sticky top-0 bg-[#f8f8f4] px-4 py-1.5 border-b border-[#E7E8D1]">
              <span className="text-xs font-bold text-gray-500">📦 Outro item</span>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={libreNome}
                onChange={(e) => setLibreNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && libreNome.trim() && addLibre()}
                placeholder="Escrever item livre..."
                className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Qtd</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={libreQtd}
                    onChange={(e) => setLibreQtd(e.target.value)}
                    className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Unidade</label>
                  <select
                    value={libreUnidade}
                    onChange={(e) => setLibreUnidade(e.target.value)}
                    className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white"
                  >
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Zona</label>
                <select
                  value={libreZona}
                  onChange={(e) => setLibreZona(e.target.value as ZonaSupermercado)}
                  className="w-full border border-[#E7E8D1] rounded-xl px-4 py-3 text-sm text-[#36454F] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white"
                >
                  {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              </div>
              <Button
                onClick={addLibre}
                disabled={!libreNome.trim() || salvando}
                className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90 min-h-[48px]"
              >
                {salvando ? 'A guardar...' : 'Adicionar à lista'}
              </Button>
            </div>
          </div>
          <div className="h-[calc(env(safe-area-inset-bottom)+8px)]" />
        </div>
      </div>
    </>
  )
}

function GerarListaSelecaoSheet({
  state,
  salvando,
  onConfirm,
  onCancel,
}: {
  state: SelecaoState
  salvando: boolean
  onConfirm: (items: SelecaoItem[]) => void
  onCancel: () => void
}) {
  const [items, setItems] = useState<SelecaoItem[]>(() => state.items)
  const selecionados = items.filter((i) => i.selecionado)
  const todosAtivos = selecionados.length === items.length

  function toggleItem(id: string) {
    setItems((prev) => prev.map((i) => i.ingrediente_id === id ? { ...i, selecionado: !i.selecionado } : i))
  }

  function toggleTodos() {
    const novoEstado = !todosAtivos
    setItems((prev) => prev.map((i) => ({ ...i, selecionado: novoEstado })))
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1] shrink-0">
          <div>
            <span className="font-bold text-[#36454F] text-sm">Confirmar ingredientes</span>
            <p className="text-xs text-gray-400 mt-0.5">
              {selecionados.length} de {items.length} selecionados
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[#E7E8D1] transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-[#E7E8D1] shrink-0">
          <button
            onClick={toggleTodos}
            className="text-xs font-semibold text-[#2D5016] hover:underline"
          >
            {todosAtivos ? 'Desselecionar tudo' : 'Selecionar tudo'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#E7E8D1]">
          {items.map((item) => (
            <label
              key={item.ingrediente_id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8f8f4] cursor-pointer min-h-[52px]"
            >
              <input
                type="checkbox"
                checked={item.selecionado}
                onChange={() => toggleItem(item.ingrediente_id)}
                className="shrink-0 h-4 w-4 rounded border-gray-300 text-[#2D5016] focus:ring-[#2D5016]"
              />
              <span className="flex-1 text-sm text-[#36454F] font-medium">{item.nome}</span>
              <span className="text-sm font-bold text-[#B85042] shrink-0">
                {item.quantidade} {item.unidade}
              </span>
            </label>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-[#E7E8D1] shrink-0">
          <Button
            onClick={() => onConfirm(selecionados)}
            disabled={selecionados.length === 0 || salvando}
            className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90 min-h-[48px]"
          >
            {salvando
              ? 'A guardar...'
              : selecionados.length === 0
                ? 'Seleciona pelo menos um item'
                : `Adicionar ${selecionados.length} ingrediente${selecionados.length !== 1 ? 's' : ''} à lista`}
          </Button>
          <div className="h-[calc(env(safe-area-inset-bottom)+4px)]" />
        </div>
      </div>
    </>
  )
}

function ListaTab({
  lista,
  onToggle,
  onRemove,
  onAddManual,
  ordenacao = 'zona',
}: {
  lista: ListaCompras | undefined
  onToggle: (id: string, comprado: boolean) => void
  onRemove: (id: string) => void
  onAddManual: () => void
  ordenacao?: 'zona' | 'alfabetica'
}) {
  const items = (lista?.items ?? []) as ListaComprasItem[]
  const total = items.reduce((sum, i) => sum + (i.preco_estimado ?? 0), 0)
  const comprados = items.filter((i) => i.comprado).length

  const grupos = useMemo(() => {
    if (ordenacao === 'alfabetica') {
      const sorted = [...items].sort((a, b) => {
        const na = (a.ingrediente?.nome ?? a.nome_custom ?? '').toLowerCase()
        const nb = (b.ingrediente?.nome ?? b.nome_custom ?? '').toLowerCase()
        return na.localeCompare(nb, 'pt')
      })
      const map = new Map<string, ListaComprasItem[]>()
      sorted.forEach((item) => {
        const nome = item.ingrediente?.nome ?? item.nome_custom ?? '?'
        const letra = nome[0]?.toUpperCase() ?? '#'
        if (!map.has(letra)) map.set(letra, [])
        map.get(letra)!.push(item)
      })
      return Array.from(map.entries()).map(([key, items]) => ({
        key,
        label: key,
        items,
      }))
    }
    // ordenacao === 'zona'
    const map = new Map<string, ListaComprasItem[]>()
    items.forEach((item) => {
      const key = item.zona_supermercado ?? 'outro'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: ZONA_LABELS[key as ZonaSupermercado] ?? key,
      items,
    }))
  }, [items, ordenacao])

  return (
    <div className="space-y-4 mt-2">
      {total > 0 && (
        <div className="bg-white rounded-lg border border-[#E7E8D1] px-4 py-2 flex justify-between text-sm">
          <span className="text-gray-500">{comprados}/{items.length} comprados</span>
          <span className="font-bold text-[#B85042]">Total estimado: {formatCurrency(total)}</span>
        </div>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
          <ShoppingCart className="h-8 w-8" />
          <p className="text-sm">Lista vazia</p>
        </div>
      )}

      {grupos.filter((g) => g.items.length > 0).map((grupo) => (
        <div key={grupo.key} className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
          <div className="bg-[#E7E8D1] px-4 py-2 flex items-center justify-between">
            <h3 className="font-bold text-[#36454F] text-sm">{grupo.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {grupo.items.filter((i) => i.comprado).length}/{grupo.items.length}
            </Badge>
          </div>
          <div className="divide-y divide-[#E7E8D1]">
            {grupo.items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 hover:bg-[#f8f8f4] transition-colors min-h-[56px]',
                  item.comprado && 'opacity-50'
                )}
              >
                <Checkbox
                  checked={item.comprado}
                  onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
                  className="shrink-0"
                />
                <label
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onToggle(item.id, !item.comprado)}
                >
                  <p className={cn(
                    'text-sm font-medium text-[#36454F]',
                    item.comprado && 'line-through'
                  )}>
                    {item.ingrediente?.nome ?? item.nome_custom ?? '?'}
                    {!item.ingrediente_id && (
                      <span className="ml-1.5 text-[10px] text-gray-400 font-normal border border-gray-200 rounded px-1">manual</span>
                    )}
                  </p>
                  {item.notas && (
                    <p className="text-xs text-gray-400 truncate">{item.notas}</p>
                  )}
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#B85042]">
                      {formatQuantidade(item.quantidade, item.unidade)}
                    </p>
                    {item.preco_estimado && (
                      <p className="text-xs text-gray-400">{formatCurrency(item.preco_estimado)}</p>
                    )}
                  </div>
                  {!item.ingrediente_id && (
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add manual item button */}
      <button
        onClick={onAddManual}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#E7E8D1] text-gray-400 hover:border-[#2D5016]/40 hover:text-[#2D5016] transition-colors min-h-[48px]"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">Adicionar item manualmente</span>
      </button>
    </div>
  )
}
