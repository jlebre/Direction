export interface Despesa {
  id: string
  campo_id: string
  numero_recibo: number
  data: string
  valor: number
  descricao: string | null
  codigo: string
  codigo_descricao: string
  tipo: 'receita' | 'despesa'
  nif_confirmado: boolean
  foto_path: string | null
  created_at: string
}

export interface LiquidacaoNif {
  id: string
  campo_id: string
  valor: number
  data: string
  observacao: string | null
  created_at: string
}

export interface CodeEntry {
  code: string
  short: string
  full: string
}

export interface CodeCategory {
  label: string
  icon: string
  color: string
  codes: CodeEntry[]
}

export interface CampoStats {
  total_despesas: number
  count_despesas: number
  saldo_disponivel: number
  por_codigo: Record<string, number>
}
