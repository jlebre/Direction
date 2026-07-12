export type TransporteSentido = 'ida' | 'volta' | 'ida_volta'
export type TransporteTipo = 'autocarro' | 'comboio' | 'aviao' | 'barco' | 'outro'
export type TransporteEstado = 'por_configurar' | 'pendente' | 'confirmado' | 'concluido' | 'cancelado'

export interface Transporte {
  id: string
  campo_id: string
  sentido: TransporteSentido
  origem: string
  destino: string
  tipo_transporte: TransporteTipo
  data?: string | null
  hora_partida?: string | null
  hora_chegada?: string | null
  empresa?: string | null
  numero_referencia?: string | null
  preco?: number | null
  observacoes?: string | null
  estado: TransporteEstado
  is_slot_padrao: boolean
  slot_key?: string | null
  is_combinado: boolean
  created_at: string
}

export interface TransporteSegmento {
  id: string
  transporte_id: string
  campo_id: string
  tipo_transporte: TransporteTipo
  origem: string
  destino: string
  data?: string | null
  hora_partida?: string | null
  hora_chegada?: string | null
  operador?: string | null
  numero_referencia?: string | null
  observacoes?: string | null
  ordem: number
  created_at: string
}

export const SENTIDO_LABELS: Record<TransporteSentido, string> = {
  ida: 'Ida',
  volta: 'Volta',
  ida_volta: 'Ida e Volta',
}

export const TIPO_TRANSPORTE_LABELS: Record<TransporteTipo, string> = {
  autocarro: 'Autocarro',
  comboio: 'Comboio',
  aviao: 'Avião',
  barco: 'Barco',
  outro: 'Outro',
}

export const TIPO_TRANSPORTE_EMOJI: Record<TransporteTipo, string> = {
  autocarro: '🚌',
  comboio: '🚂',
  aviao: '✈️',
  barco: '⛴️',
  outro: '🚗',
}

export const ESTADO_LABELS: Record<TransporteEstado, string> = {
  por_configurar: 'Por configurar',
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const ESTADO_CORES: Record<TransporteEstado, string> = {
  por_configurar: 'bg-gray-50 text-gray-400 border-gray-200',
  pendente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmado: 'bg-green-50 text-green-700 border-green-200',
  concluido: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelado: 'bg-gray-100 text-gray-500 border-gray-200',
}

export const SLOT_KEY_ORDER: Record<string, number> = {
  ida_lisboa: 1, ida_porto: 2, ida_coimbra: 3,
  volta_lisboa: 1, volta_porto: 2, volta_coimbra: 3,
}

export const SLOTS_PADRAO_DEF = [
  { sentido: 'ida' as const, origem: 'Lisboa', destino: 'Campo', slot_key: 'ida_lisboa' },
  { sentido: 'ida' as const, origem: 'Porto', destino: 'Campo', slot_key: 'ida_porto' },
  { sentido: 'ida' as const, origem: 'Coimbra', destino: 'Campo', slot_key: 'ida_coimbra' },
  { sentido: 'volta' as const, origem: 'Campo', destino: 'Lisboa', slot_key: 'volta_lisboa' },
  { sentido: 'volta' as const, origem: 'Campo', destino: 'Porto', slot_key: 'volta_porto' },
  { sentido: 'volta' as const, origem: 'Campo', destino: 'Coimbra', slot_key: 'volta_coimbra' },
]
