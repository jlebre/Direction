export interface MatchItem {
  filename: string
  url: string
  size: number | null
  despesa: {
    id: string
    numero_recibo: number
    descricao: string | null
    valor: number
  }
}

export interface OrphanItem {
  filename: string
  url: string
  size: number | null
}

export interface MissingItem {
  id: string
  numero_recibo: number
  descricao: string | null
  valor: number
  filename: string
}
