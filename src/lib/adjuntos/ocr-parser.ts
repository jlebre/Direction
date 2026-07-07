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
  nif_detectado: string | null   // 9 dígitos sem prefixo PT
  nif_linha_original: string | null
  linhas: LinhaParsed[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Converte valor monetário PT ("1,49" ou "1.49" ou "1.234,56") para float. */
function parseMoney(s: string): number | null {
  const t = s.trim()
  if (/^\d+,\d{2}$/.test(t)) return parseFloat(t.replace(',', '.'))
  if (/^\d+\.\d{2}$/.test(t)) return parseFloat(t)
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(t))
    return parseFloat(t.replace(/\./g, '').replace(',', '.'))
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

/**
 * Palavras que identificam linhas administrativas/fiscais.
 * Se qualquer uma aparecer, a linha NÃO é produto.
 */
const SKIP_KEYWORDS = [
  // Totais e pagamentos
  'total', 'pagar', 'subtotal', 'sub-total', 'montante',
  // IVA e impostos
  'iva', 'taxa iva', '% iva', 'base tributável', 'base tributavel',
  'isento', 'inc. iva', 'iva incluído', 'iva nao sujeito', 'iva não sujeito',
  // Meios de pagamento
  'visa', 'multibanco', 'mb way', 'mbway', 'cartão', 'cartao', 'atm',
  'terminal pos', 'pos ', 'numerário', 'numerario',
  // Troco / recibos
  'troco', 'talão', 'talao',
  // Dados de identificação / cabeçalho
  'nif', 'contribuinte', 'n.º contrib', 'nº contrib', 'cod fiscal', 'código fiscal',
  'atcud', 'certificado', 'processado por', 'programa certificado',
  'decreto-lei', 'decreto lei',
  // Dados de contacto / loja
  'morada', 'endereço', 'endereco', 'telefone', 'telef', 'tel:', 'sede:',
  'fax', 'email', '@', 'www.', 'http',
  // Texto de loja
  'obrigado', 'obrigada', 'bem-vindo', 'bem vindo',
  'devolução', 'devolucao', 'troca',
  // Referências de documento
  'fatura simplificada', 'fatura nº', 'fatura n.', 'registada crc',
  'operador', 'operadora', 'caixa', 'atendido por', 'vendedor:', 'cliente:',
  'referencia', 'referência', 'nro:', 'loja',
  // Descontos (linhas de desconto não são produto)
  'desconto', 'desc.', 'bolsa nif',
  // Emissão
  'emissão', 'emissao',
]

/** Palavras que sinalizam o FIM da zona de produtos. */
const STOP_PRODUCT_RE = [
  /total\s+a\s+pagar/i,
  /valor\s+a\s+pagar/i,
  /montante\s+pago/i,
  /total\s+pago/i,
  /\btotal\b/i,
  /\bsubtotal\b/i,
  /\bsub-total\b/i,
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
  { pattern: /meu\s*super/i,                 nome: 'Meu Super' },
  { pattern: /\bspar\b/i,                    nome: 'Spar' },
  { pattern: /\bpetrolx\b|\bgalpenergia\b|\bgalp\b/i, nome: 'Galp' },
  { pattern: /\brepsol\b/i,                  nome: 'Repsol' },
  { pattern: /\bbp\b/i,                      nome: 'BP' },
]

// ── Padrões de quantidade ──────────────────────────────────────────────────────

// "LEITE UHT 1L   6 X 0,89 5,34"
const RE_QTD_INT =
  /^(.*?)\s+(\d+)\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/

// "BANANA KG 0,750 KG X 1,99 1,49"
const RE_QTD_KG =
  /^(.*?)\s+(\d+[,.]\d{3,})\s*kg\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/i

// Linha de quantidade isolada: "2 X 1,75 3,50" sem nome antes
const RE_QTD_ONLY =
  /^(\d+)\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/

// Linha simples: "ARROZ AGULHA 1KG   1,49"  (2+ espaços antes do preço)
const RE_SIMPLES_2SP =
  /^(.+?)\s{2,}(\d+[,.]\d{2})\s*$/

// Linha simples fallback: "ARROZ AGULHA 1KG 1,49" (1 espaço)
const RE_SIMPLES_1SP =
  /^(.+)\s+(\d+[,.]\d{2})\s*$/

// ── Filtros de linha ──────────────────────────────────────────────────────────

/** True se a linha deve ser ignorada como produto (fiscal/administrativa). */
function isNonProductLine(linha: string): boolean {
  const lower = linha.toLowerCase()
  const upper = linha.toUpperCase()

  // Contém percentagem → tabela fiscal (IVA, taxas)
  if (lower.includes('%')) return true

  // Contém palavra bloqueante
  if (SKIP_KEYWORDS.some(kw => lower.includes(kw))) return true

  // Linha só com números e separadores (ex: "0,30 0,00 0,30")
  if (/^[\d\s.,]+$/.test(linha.trim())) return true

  // Prefixo NS sem texto descritivo depois (ex: "NS 0,30 0,00")
  // NS + espaço + só números → fiscal
  if (/^NS\s+[\d\s.,]+$/.test(upper.trim())) return true

  // Linha com (€) ou (C)/(I)/(E) seguido de % ou só números
  if (/^\([€CIE]\)\s*[\d\s.,]+$/.test(upper.trim())) return true
  if (/^\([€CIE]\)\s+\d+[,.]\d+%/.test(upper.trim())) return true

  return false
}

/** Retorna true se a linha marca o fim da zona de produtos. */
function isStopLine(linha: string): boolean {
  return STOP_PRODUCT_RE.some(re => re.test(linha))
}

/** Remove prefixos fiscais de início de linha de produto. */
function stripFiscalPrefix(s: string): string {
  return s
    .replace(/^\([A-Z€]\)\s*/i, '')  // (C), (I), (E), (€)
    .replace(/^NS\s+/i, '')           // NS (Não Sujeito)
    .trim()
}

// ── Funções de detecção ────────────────────────────────────────────────────────

function detectarFornecedor(linhas: string[]): string | null {
  const amostra = linhas.slice(0, 8).join(' ')
  for (const { pattern, nome } of FORNECEDORES_CONHECIDOS) {
    if (pattern.test(amostra)) return nome
  }
  return null
}

function detectarData(texto: string): string | null {
  const m = texto.match(/\b(\d{2})[/\-.](\d{2})[/\-.](\d{2,4})\b/)
  if (!m) return null
  const [, dd, mm, aaaa] = m
  const year = aaaa.length === 2 ? `20${aaaa}` : aaaa
  const d = parseInt(dd), mo = parseInt(mm), y = parseInt(year)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function detectarTotal(linhas: string[]): number | null {
  const candidatos: number[] = []
  for (const linha of [...linhas].reverse()) {
    const lower = linha.toLowerCase()
    if (TOTAL_KEYWORDS.some(re => re.test(lower))) {
      const valores = encontrarMonetarios(linha)
      if (valores.length > 0) candidatos.push(Math.max(...valores))
    }
  }
  return candidatos[0] ?? null
}

/**
 * Extrai NIF (9 dígitos) do texto completo.
 * Alta confiança: keyword NIF explícita.
 * Média confiança: prefixo PT + 9 dígitos.
 */
function extractNif(texto: string): { nif: string | null; linha: string | null } {
  const linhas = texto.split('\n')

  // Alta confiança: "NIF: PT501979891" ou "NIF: 501979891" ou "NIF PT501979891"
  const reNifKeyword = /NIF[:\s]*(?:PT)?\s*([1235689]\d{8})\b/i
  for (const l of linhas) {
    const m = l.match(reNifKeyword)
    if (m) return { nif: m[1], linha: l.trim() }
  }

  // Média confiança: "PT501979891" no texto
  const rePT = /\bPT([1235689]\d{8})\b/
  for (const l of linhas) {
    const m = l.match(rePT)
    if (m) return { nif: m[1], linha: l.trim() }
  }

  return { nif: null, linha: null }
}

// ── Parser de linha individual ─────────────────────────────────────────────────

function parseLinha(linha: string): LinhaParsed | null {
  const limpa = linha.trim().replace(/\s+/g, ' ')
  if (!limpa || limpa.length < 3) return null
  if (isNonProductLine(limpa)) return null

  const monetarios = encontrarMonetarios(limpa)
  if (monetarios.length === 0) return null

  const nomeLimpo = (raw: string) => titularize(stripFiscalPrefix(raw))

  // Padrão: qtd inteiro × preço unit total  "6 X 0,89 5,34"
  const mQtdInt = limpa.match(RE_QTD_INT)
  if (mQtdInt) {
    const nome = nomeLimpo(mQtdInt[1])
    if (nome.length < 2) return null
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: nome,
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
    const nome = nomeLimpo(mQtdKg[1])
    if (nome.length < 2) return null
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: nome,
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
    const nome = nomeLimpo(mSimples2[1])
    if (nome.length < 2) return null
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: nome,
      quantidade: null,
      unidade: null,
      preco_unitario: null,
      preco_total: parseMoney(mSimples2[2]),
      confianca: 'media',
    }
  }

  // Padrão simples fallback (1 espaço)
  const mSimples1 = limpa.match(RE_SIMPLES_1SP)
  if (mSimples1) {
    const nome = nomeLimpo(mSimples1[1])
    if (nome.length < 3) return null
    return {
      texto_linha_original: limpa,
      nome_produto_bruto: nome,
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
  const { nif: nif_detectado, linha: nif_linha_original } = extractNif(textoBruto)

  // Parsing de produtos com stop na linha de total e mecanismo de linha pendente
  const linhasParsed: LinhaParsed[] = []
  let pendingNome: string | null = null  // nome de produto sem preço na linha anterior

  for (const linha of linhas) {
    const limpa = linha.trim().replace(/\s+/g, ' ')
    if (!limpa) continue

    // Parar quando encontramos linha de total
    if (isStopLine(limpa)) {
      pendingNome = null
      break
    }

    // Linha só com quantidade+preço (sem nome): "2 X 1,75 3,50"
    const mQtdOnly = limpa.match(RE_QTD_ONLY)
    if (mQtdOnly && pendingNome) {
      // Combinar nome pendente com esta linha de quantidade
      const combined = `${pendingNome} ${limpa}`
      const parsed = parseLinha(combined)
      if (parsed) linhasParsed.push(parsed)
      pendingNome = null
      continue
    }

    if (isNonProductLine(limpa)) {
      pendingNome = null
      continue
    }

    const parsed = parseLinha(limpa)
    if (parsed && parsed.preco_total !== null) {
      linhasParsed.push(parsed)
      pendingNome = null
    } else {
      // Linha sem preço — pode ser nome de produto que continua na linha seguinte
      const monetarios = encontrarMonetarios(limpa)
      if (monetarios.length === 0 && limpa.length >= 3) {
        const stripped = stripFiscalPrefix(limpa)
        pendingNome = stripped.length >= 3 ? stripped : null
      } else {
        pendingNome = null
      }
    }
  }

  // Remove duplicados por nome_produto_bruto
  const semDuplicados = linhasParsed.filter(
    (l, i, arr) => arr.findIndex(x => x.nome_produto_bruto === l.nome_produto_bruto) === i
  )

  return {
    texto_bruto: textoBruto,
    total_detectado,
    fornecedor,
    data_detectada,
    nif_detectado,
    nif_linha_original,
    linhas: semDuplicados,
  }
}
