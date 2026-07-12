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
  arquivado?: boolean
}

/** Campo sem o campo pin — tipo seguro para passar a componentes client */
export type CampoPublico = Omit<Campo, 'pin'>

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

export const ESCALAO_COR: Record<string, { bg: string; text: string; light: string; border: string }> = {
  Mosquito:  { bg: '#D97706', text: '#78350F', light: '#FFFBEB', border: '#FCD34D' },
  Aranhiço:  { bg: '#EA580C', text: '#7C2D12', light: '#FFF7ED', border: '#FDBA74' },
  Melga:     { bg: '#16A34A', text: '#052E16', light: '#F0FDF4', border: '#86EFAC' },
  Tremelga:  { bg: '#2563EB', text: '#1E3A8A', light: '#EFF6FF', border: '#93C5FD' },
  Camaleão:  { bg: '#DC2626', text: '#7F1D1D', light: '#FEF2F2', border: '#FCA5A5' },
}

export function getDiaLabel(dia: number): string {
  if (dia === -2) return 'Pré-campo 1'
  if (dia === -1) return 'Pré-campo 2'
  return `Dia ${dia}`
}

export function getNumDias(seccao?: SeccaoTipo): number {
  return seccao === 'mosquitos' ? 7 : 10
}
