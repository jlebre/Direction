import type { SeccaoTipo } from './shared'

export type RefeicaoTipo = 'pequeno_almoco' | 'almoco' | 'lanche' | 'jantar' | 'ceia' | 'extra'
export type ArmazenamentoTipo = 'despensa' | 'casa_apoio' | 'fresco_diario'
export type RestricaoTipo = 'alergia' | 'intolerancia' | 'dieta' | 'outro'
export type CategoriaReceita =
  | 'sopa' | 'carne' | 'frango' | 'bacalhau' | 'atum'
  | 'massa' | 'arroz_pure' | 'salada' | 'fruta' | 'doce'
  | 'molho' | 'pequeno_almoco' | 'lanche' | 'outro'
export type ZonaSupermercado =
  | 'mercearia' | 'enlatados' | 'massas_arroz' | 'bebidas_leite'
  | 'congelados' | 'limpeza' | 'padaria' | 'talho' | 'peixaria'
  | 'frutas_legumes' | 'lacticinios' | 'charcutaria' | 'temperos' | 'outro'

// ── Animados ────────────────────────────────────────────────────────────────
export interface Animado {
  id: string
  campo_id: string
  nome: string
  data_nascimento: string | null
  seccao: string | null
  notas: string | null
  created_at: string
  restricoes?: RestricaoAlimentar[]
  medicacoes?: FarmaciaMedicacao[]
  contactos?: ContactoEmergencia[]
}

// ── Receitas ─────────────────────────────────────────────────────────────────
export interface Ingrediente {
  id: string
  nome: string
  categoria_supermercado: ZonaSupermercado
  unidade_base: string
  tipo_armazenamento: ArmazenamentoTipo
  created_at: string
}

export interface Receita {
  id: string
  nome: string
  categoria: CategoriaReceita
  descricao?: string
  instrucoes?: string
  dicas_campo?: string
  tags: string[]
  pessoas_base: number
  is_oficial: boolean
  created_at: string
  updated_at: string
  ingredientes?: ReceitaIngrediente[]
}

export interface ReceitaIngrediente {
  id: string
  receita_id: string
  ingrediente_id: string
  quantidade_mosquitos?: number
  quantidade_aranh_melgas?: number
  quantidade_cam_trem?: number
  unidade: string
  notas?: string
  ingrediente?: Ingrediente
}

// ── Ementa ───────────────────────────────────────────────────────────────────
export interface EmentaItem {
  id: string
  campo_id: string
  dia: number
  refeicao: RefeicaoTipo
  receita_id?: string
  receita_nome_custom?: string
  responsavel?: string
  notas?: string
  ordem: number
  receita?: Receita
}

// ── Lista de Compras ──────────────────────────────────────────────────────────
export interface ListaCompras {
  id: string
  campo_id: string
  tipo: ArmazenamentoTipo
  gerada_em: string
  items?: ListaComprasItem[]
}

export interface ListaComprasItem {
  id: string
  lista_id: string
  ingrediente_id?: string
  nome_custom?: string
  quantidade: number
  unidade: string
  zona_supermercado?: ZonaSupermercado
  dia?: number
  preco_estimado?: number
  comprado: boolean
  comprado_por?: string
  comprado_em?: string
  notas?: string
  ingrediente?: Ingrediente
}

// ── Restrições, Farmácia, Contactos ─────────────────────────────────────────
export interface RestricaoAlimentar {
  id: string
  animado_id: string
  tipo: RestricaoTipo
  descricao: string
  ingredientes_proibidos: string[]
  notas?: string
  animado?: Animado
}

export interface FarmaciaMedicacao {
  id: string
  animado_id: string
  medicamento: string
  horarios: string[]
  notas?: string
  ativo: boolean
  animado?: Animado
}

export interface FarmaciaInventario {
  id: string
  campo_id: string
  item: string
  quantidade_inicial: number
  quantidade_gasta: number
  notas?: string
}

export interface ContactoEmergencia {
  id: string
  animado_id: string
  tipo: string
  nome: string
  telefone: string
  notas?: string
  animado?: Animado
}

// ── Produtos & Preços ────────────────────────────────────────────────────────
export interface CampoProduto {
  id: string
  campo_id: string
  nome: string
  categoria: string
  quantidade?: number
  unidade: string
  notas?: string
  created_at: string
}

export interface CampoPreco {
  id: string
  campo_id: string
  item: string
  categoria: string
  preco?: number
  unidade: string
  fornecedor: string
  notas?: string
  created_at: string
  campo?: { nome: string }
}

// ── Labels & Cores ────────────────────────────────────────────────────────────
export const REFEICAO_LABELS: Record<RefeicaoTipo, string> = {
  pequeno_almoco: 'Pequeno-almoço',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
  extra: 'Extra',
}

export const CATEGORIA_LABELS: Record<CategoriaReceita, string> = {
  sopa: 'Sopa', carne: 'Carne', frango: 'Frango', bacalhau: 'Bacalhau',
  atum: 'Atum', massa: 'Massa', arroz_pure: 'Arroz / Puré', salada: 'Salada',
  fruta: 'Fruta', doce: 'Doce', molho: 'Molho',
  pequeno_almoco: 'Pequeno-almoço', lanche: 'Lanche', outro: 'Outro',
}

export const CATEGORIA_CORES: Record<CategoriaReceita, string> = {
  sopa: 'bg-green-100 text-green-800 border-green-200',
  carne: 'bg-red-100 text-red-800 border-red-200',
  frango: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  bacalhau: 'bg-blue-100 text-blue-800 border-blue-200',
  atum: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  massa: 'bg-orange-100 text-orange-800 border-orange-200',
  arroz_pure: 'bg-amber-100 text-amber-800 border-amber-200',
  salada: 'bg-lime-100 text-lime-800 border-lime-200',
  fruta: 'bg-pink-100 text-pink-800 border-pink-200',
  doce: 'bg-purple-100 text-purple-800 border-purple-200',
  molho: 'bg-rose-100 text-rose-800 border-rose-200',
  pequeno_almoco: 'bg-sky-100 text-sky-800 border-sky-200',
  lanche: 'bg-teal-100 text-teal-800 border-teal-200',
  outro: 'bg-gray-100 text-gray-800 border-gray-200',
}

export const ZONA_LABELS: Record<ZonaSupermercado, string> = {
  mercearia: 'Mercearia', enlatados: 'Enlatados', massas_arroz: 'Massas e Arroz',
  bebidas_leite: 'Bebidas e Leite', congelados: 'Congelados', limpeza: 'Limpeza',
  padaria: 'Padaria', talho: 'Talho', peixaria: 'Peixaria',
  frutas_legumes: 'Frutas e Legumes', lacticinios: 'Lacticínios',
  charcutaria: 'Charcutaria', temperos: 'Temperos', outro: 'Outro',
}

export function calcularQuantidade(
  seccao: SeccaoTipo,
  qtdMosquitos: number | null | undefined,
  qtdAranhMelgas: number | null | undefined,
  qtdCamTrem: number | null | undefined,
  pessoasCampo: number,
  pessoasBase = 58
): number {
  let qtdBase: number | null | undefined
  switch (seccao) {
    case 'mosquitos':
      qtdBase = qtdMosquitos ?? qtdAranhMelgas
      break
    case 'aranhicos':
    case 'melgas':
      qtdBase = qtdAranhMelgas ?? qtdCamTrem
      break
    case 'tremelgas':
    case 'camaleoes':
      qtdBase = qtdCamTrem ?? qtdAranhMelgas
      break
    default:
      qtdBase = qtdAranhMelgas ?? qtdCamTrem ?? qtdMosquitos
  }
  if (!qtdBase) return 0
  return Math.ceil((qtdBase * pessoasCampo) / pessoasBase * 100) / 100
}
