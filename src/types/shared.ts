export type SeccaoTipo = 'mosquitos' | 'aranhicos' | 'melgas' | 'tremelgas' | 'camaleoes'

export interface Campo {
  id: string
  nome: string
  escalao: string
  datas: string
  pre_campo: string | null
  local: string | null
  diretor: string
  adjunto: string
  mama: string
  saldo_inicial: number
  pin: string | null
  setup_completo: boolean
  created_at: string
  // Campos do módulo Mamãs
  seccao?: SeccaoTipo
  ano?: number
  data_inicio?: string
  data_fim?: string
  data_precampo_inicio?: string
  data_precampo_fim?: string
  num_animados?: number
  num_animadores?: number
  orcamento_alimentacao?: number
  orcamento_compras_gerais?: number
  orcamento_talho?: number
  orcamento_pao?: number
  orcamento_frutas_legumes?: number
  orcamento_diversos?: number
  periodo?: number
}

export const SECCAO_LABELS: Record<SeccaoTipo, string> = {
  mosquitos: 'Mosquitos',
  aranhicos: 'Aranhiços',
  melgas: 'Melgas',
  tremelgas: 'Tremelgas',
  camaleoes: 'Camaleões',
}

export const ESCALAO_EMOJI: Record<string, string> = {
  Mosquito: '🦟',
  Aranhiço: '🕷️',
  Melga: '🐛',
  Tremelga: '🐊',
  Camaleão: '🦎',
}

export function getDiaLabel(dia: number): string {
  if (dia === -2) return 'Pré-campo 1'
  if (dia === -1) return 'Pré-campo 2'
  return `Dia ${dia}`
}

export function getNumDias(seccao?: SeccaoTipo): number {
  return seccao === 'mosquitos' ? 7 : 10
}
