/**
 * Parser puro de texto OCR de faturas portuguesas.
 * Sem efeitos secundários, sem dependências externas — testável isoladamente.
 */

export type LinhaParsed = {
  texto_linha_original: string
  nome_produto_bruto: string
  quantidade: number | null
  unidade: string | null
  preco_unitario: number | null
  preco_total: number | null
  confianca: 'alta' | 'media' | 'baixa'
}

export type OcrResultado = {
  texto_bruto: string
  total_detectado: number | null
  fornecedor: string | null
  data_detectada: string | null  // ISO: YYYY-MM-DD
  linhas: LinhaParsed[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Converte valor monetário PT ("1,49" ou "1.49" ou "1.234,56") para float. */
function parseMoney(s: string): number | null {
  const t = s.trim()
  // "1,49" → decimal comma (2 decimal digits after comma)
  if (/^\d+,\d{2}$/.test(t)) return parseFloat(t.replace(',', '.'))
  // "1.49" → decimal dot
  if (/^\d+\.\d{2}$/.test(t)) return parseFloat(t)
  // "1.234,56" → European thousands + decimal
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(t))
    return parseFloat(t.replace(/\./g, '').replace(',', '.'))
  // Fallback: replace comma → dot
  const clean = t.replace(',', '.')
  const v = parseFloat(clean)
  return isNaN(v) ? null : v
}

/** Encontra todos os valores monetários numa linha de texto. */
function encontrarMonetarios(linha: string): number[] {
  const matches = [...linha.matchAll(/\b(\d+[.,]\d{2})\b/g)]
  return matches.map(m => parseMoney(m[1])).filter((v): v is number => v !== null)
}

// ── Listas de palavras-chave ───────────────────────────────────────────────────

const SKIP_KEYWORDS = [
  'nif', 'contribuinte', 'iva', 'subtotal', 'sub-total', 'troco', 'pagamento',
  'multibanco', 'mb way', 'mbway', 'cartão', 'cartao', 'obrigado', 'obrigada',
  'bem-vindo', 'bem vindo', 'morada', 'endereço', 'endereco', 'telefone', 'telef',
  'fax', 'email', '@', 'www.', 'http', 'operador', 'operadora', 'caixa',
  'taxa iva', '% iva', 'base tributável', 'base tributavel', 'cod fiscal',
  'código fiscal', 'n.º contrib', 'nº contrib', 'atm', 'terminal pos', 'pos ',
  'desconto', 'desc.', 'isento', 'inc. iva', 'iva incluído', 'bolsa nif',
  'emissão', 'emissao', 'talão', 'talao', 'recibo', 'factura', 'fatura nº',
  'referencia', 'referência', 'atendido por', 'vendedor:', 'cliente:',
]

const TOTAL_KEYWORDS = [
  /total\s+a\s+pagar/i,
  /valor\s+a\s+pagar/i,
  /montante\s+pago/i,
  /total\s+pago/i,
  /a\s+pagar/i,
  /\btotal\b/i,
  /\bmontante\b/i,
]

const FORNECEDORES_CONHECIDOS: Array<{ pattern: RegExp; nome: string }> = [
  { pattern: /continente/i,                  nome: 'Continente' },
  { pattern: /pingo\s*doce/i,                nome: 'Pingo Doce' },
  { pattern: /\blidl\b/i,                    nome: 'Lidl' },
  { pattern: /\baldi\b/i,                    nome: 'Aldi' },
  { pattern: /mercadona/i,                   nome: 'Mercadona' },
  { pattern: /auchan/i,                      nome: 'Auchan' },
  { pattern: /intermarch/i,                  nome: 'Intermarché' },
  { pattern: /\bjumbo\b/i,                   nome: 'Jumbo' },
  { pattern: /miniprec[oô]/i,                nome: 'Minipreço' },
  { pattern: /el\s*corte\s*ingl/i,           nome: 'El Corte Inglés' },
  { pattern: /\bmetro\b/i,                   nome: 'Metro' },
  { pattern: /makro/i,                       nome: 'Makro' },
]

// ── Padrões de quantidade ──────────────────────────────────────────────────────

// "LEITE UHT 1L   6 X 0,89 5,34"  →  nome="LEITE UHT 1L" qtd=6 unit="un" pUnit=0.89 total=5.34
const RE_QTD_INT =
  /^(.*?)\s+(\d+)\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/

// "BANANA KG 0,750 KG X 1,99 1,49"  →  nome="BANANA KG" qtd=0.75 unit="kg" pUnit=1.99 total=1.49
const RE_QTD_KG =
  /^(.*?)\s+(\d+[,.]\d{3,})\s*kg\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/i

// Linha simples: "ARROZ AGULHA 1KG   1,49"  (2+ espaços antes do preço)
const RE_SIMPLES_2SP =
  /^(.+?)\s{2,}(\d+[,.]\d{2})\s*$/

// Linha simples fallback: "ARROZ AGULHA 1KG 1,49" (1 espaço)
const RE_SIMPLES_1SP =
  /^(.+)\s+(\d+[,.]\d{2})\s*$/

// ── Funções de detecção ────────────────────────────────────────────────────────

function deveIgnorar(linha: string): boolean {
  const lower = linha.toLowerCase()
  return SKIP_KEYWORDS.some(kw => lower.includes(kw))
}

function detectarFornecedor(linhas: string[]): string | null {
  // Verifica as primeiras 8 linhas — o nome do supermercado costuma estar no topo
  const amostra = linhas.slice(0, 8).join(' ')
  for (const { pattern, nome } of FORNECEDORES_CONHECIDOS) {
    if (pattern.test(amostra)) return nome
  }
  return null
}

function detectarData(texto: string): string | null {
  // Formatos: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY
  const m = texto.match(/\b(\d{2})[/\-.](\d{2})[/\-.](\d{2,4})\b/)
  if (!m) return null
  const [, dd, mm, aaaa] = m
  const year = aaaa.length === 2 ? `20${aaaa}` : aaaa
  const d = parseInt(dd), mo = parseInt(mm), y = parseInt(year)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function detectarTotal(linhas: string[]): number | null {
  // Procura de baixo para cima — o total aparece no fim do talão
  const candidatos: number[] = []
  for (const linha of [...linhas].reverse()) {
    const lower = linha.toLowerCase()
    const eTotalLine = TOTAL_KEYWORDS.some(re => re.test(lower))
    if (eTotalLine) {
      const valores = encontrarMonetarios(linha)
      if (valores.length > 0) {
        // Pega o maior valor desta linha (geralmente o total)
        candidatos.push(Math.max(...valores))
      }
    }
  }
  // Prioridade: primeiro total encontrado de baixo para cima
  return candidatos[0] ?? null
}

function parseLinha(linha: string): LinhaParsed | null {
  const limpa = linha.trim().replace(/\s+/g, ' ')
  if (!limpa || limpa.length < 3) return null
  if (deveIgnorar(limpa)) return null

  // Verifica se tem pelo menos um valor monetário
  const monetarios = encontrarMonetarios(limpa)
  if (monetarios.length === 0) return null

  // Padrão: qtd inteiro × preço unit total  "6 X 0,89 5,34"
  const mQtdInt = limpa.match(RE_QTD_INT)
  if (mQtdInt) {
    const nome = mQtdInt[1].trim()
    if (nome.length < 2) return null
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: titularize(nome),
      quantidade: parseFloat(mQtdInt[2]),
      unidade: 'un',
      preco_unitario: parseMoney(mQtdInt[3]),
      preco_total: parseMoney(mQtdInt[4]),
      confianca: 'alta',
    }
  }

  // Padrão: quantidade em KG × preço  "0,750 KG X 4,99 3,74"
  const mQtdKg = limpa.match(RE_QTD_KG)
  if (mQtdKg) {
    const nome = mQtdKg[1].trim()
    if (nome.length < 2) return null
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: titularize(nome),
      quantidade: parseMoney(mQtdKg[2]),
      unidade: 'kg',
      preco_unitario: parseMoney(mQtdKg[3]),
      preco_total: parseMoney(mQtdKg[4]),
      confianca: 'alta',
    }
  }

  // Padrão simples com 2+ espaços antes do preço
  const mSimples2 = limpa.match(RE_SIMPLES_2SP)
  if (mSimples2) {
    const nome = mSimples2[1].trim()
    if (nome.length < 2) return null
    const total = parseMoney(mSimples2[2])
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: titularize(nome),
      quantidade: null,
      unidade: null,
      preco_unitario: null,
      preco_total: total,
      confianca: 'media',
    }
  }

  // Padrão simples fallback (1 espaço)
  const mSimples1 = limpa.match(RE_SIMPLES_1SP)
  if (mSimples1) {
    const nome = mSimples1[1].trim()
    // Ignorar se o "nome" tem keywords administrativas ou é muito curto
    if (nome.length < 3 || deveIgnorar(nome)) return null
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: titularize(nome),
      quantidade: null,
      unidade: null,
      preco_unitario: null,
      preco_total: parseMoney(mSimples1[2]),
      confianca: 'baixa',
    }
  }

  return null
}

/** Converte "ARROZ AGULHA 1KG" → "Arroz Agulha 1KG" */
function titularize(s: string): string {
  return s.toLowerCase().replace(/\b([a-záàâãéêíóôõúüç])/g, c => c.toUpperCase())
}

// ── Função principal ───────────────────────────────────────────────────────────

/**
 * Parseia texto OCR de uma fatura e devolve dados estruturados.
 * Função pura — não tem efeitos secundários.
 */
export function parsearFatura(textoBruto: string): OcrResultado {
  const linhas = textoBruto.split('\n').map(l => l.trim()).filter(Boolean)

  const fornecedor = detectarFornecedor(linhas)
  const data_detectada = detectarData(textoBruto)
  const total_detectado = detectarTotal(linhas)

  const linhasParsed: LinhaParsed[] = []
  for (const linha of linhas) {
    const parsed = parseLinha(linha)
    if (parsed && parsed.preco_total !== null) {
      linhasParsed.push(parsed)
    }
  }

  // Remove duplicados (mesma linha aparece duas vezes por OCR noise)
  const semDuplicados = linhasParsed.filter(
    (l, i, arr) => arr.findIndex(x => x.nome_produto_bruto === l.nome_produto_bruto) === i
  )

  return {
    texto_bruto: textoBruto,
    total_detectado,
    fornecedor,
    data_detectada,
    linhas: semDuplicados,
  }
}
