export type TransporteSentido = 'ida' | 'volta' | 'ida_volta'
export type TransporteTipo = 'autocarro' | 'comboio' | 'aviao' | 'barco' | 'outro'
export type TransporteEstado = 'pendente' | 'confirmado' | 'cancelado'

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
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

export const ESTADO_CORES: Record<TransporteEstado, string> = {
  pendente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmado: 'bg-green-50 text-green-700 border-green-200',
  cancelado: 'bg-gray-100 text-gray-500 border-gray-200',
}
