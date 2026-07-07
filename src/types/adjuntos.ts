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
  is_regularizacao_nif: boolean
  created_at: string
  // OCR fields (nullable — despesas sem foto ou sem OCR têm 'nenhum')
  ocr_status: 'nenhum' | 'processado' | 'falhou' | null
  ocr_texto: string | null
  ocr_fornecedor: string | null
  ocr_total: number | null
  ocr_data: string | null
}

export interface DespesaLinha {
  id: string
  despesa_id: string
  texto_linha_original: string
  nome_produto_bruto: string
  ingrediente_id: string | null
  campo_preco_id: string | null
  quantidade: number | null
  unidade: string | null
  preco_unitario: number | null
  preco_total: number | null
  confianca: 'alta' | 'media' | 'baixa'
  estado: 'sugerido' | 'confirmado' | 'corrigido' | 'ignorado'
  tipo_linha: string | null    // 'produto' | 'deposito' | 'desconto' | 'iva' | 'total' | 'pagamento' | 'administrativo'
  categoria_linha: string | null
  created_at: string
  updated_at: string
}

export interface ProdutoAlias {
  id: string
  alias: string
  ingrediente_id: string | null
  campo_preco_id: string | null
  origem: 'ocr' | 'manual'
  created_at: string
}

/** Ligação entre fatura original (sem NIF) e fatura de regularização (com NIF) */
export interface RegularizacaoNif {
  id: string
  campo_id: string
  despesa_regularizacao_id: string
  despesa_original_id: string
  valor: number
  created_at: string
}

/** @deprecated Substituído por RegularizacaoNif — tabela liquidacoes_nif mantida por compatibilidade */
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
