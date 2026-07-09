/**
 * Parser puro de texto OCR de faturas portuguesas.
 * Sem efeitos secundários, sem dependências externas — testável isoladamente.
 */

export type TipoLinha =
  | 'produto'
  | 'deposito'
  | 'desconto'
  | 'iva'
  | 'total'
  | 'pagamento'
  | 'administrativo'

export type LinhaParsed = {
  texto_linha_original: string
  nome_produto_bruto: string
  quantidade: number | null
  unidade: string | null
  preco_unitario: number | null
  preco_total: number | null
  confianca: 'alta' | 'media' | 'baixa'
  tipo_linha: TipoLinha
  categoria_linha: string | null
}

export type OcrResultado = {
  texto_bruto: string
  total_detectado: number | null
  fornecedor: string | null
  data_detectada: string | null  // ISO: YYYY-MM-DD
  nif_detectado: string | null   // 9 dígitos sem prefixo PT
  nif_linha_original: string | null
  linhas: LinhaParsed[]           // apenas tipo_linha = 'produto'
  linhasEspeciais: LinhaParsed[]  // deposito, iva, total, pagamento, desconto
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function encontrarMonetarios(linha: string): number[] {
  const matches = [...linha.matchAll(/\b(\d+[.,]\d{2})\b/g)]
  return matches.map(m => parseMoney(m[1])).filter((v): v is number => v !== null)
}

// ── Classificação de tipo de linha ────────────────────────────────────────────

const DEP_KEYWORDS = ['deposito', 'depósito', 'tara', 'taras', 'valor de deposito', 'valor de depósito']
const DESC_KEYWORDS = ['desconto', 'abatimento', 'cupao', 'cupão', 'promo', 'promocao', 'promoção', 'talao', 'talão']
const PAG_KEYWORDS = ['visa', 'multibanco', 'mb way', 'mbway', 'numerário', 'numerario', 'troco']

const ADMIN_KEYWORDS = [
  'nif', 'contribuinte', 'n.º contrib', 'nº contrib', 'cod fiscal', 'código fiscal',
  'atcud', 'certificado', 'processado por', 'programa certificado',
  'decreto-lei', 'decreto lei',
  'morada', 'endereço', 'endereco', 'telefone', 'telef', 'tel:', 'sede:',
  'fax', 'email', '@', 'www.', 'http',
  'obrigado', 'obrigada', 'bem-vindo', 'bem vindo',
  'devolução', 'devolucao', 'troca',
  'fatura simplificada', 'fatura nº', 'fatura n.', 'registada crc',
  'operador', 'operadora', 'caixa', 'atendido por', 'vendedor:', 'cliente:',
  'referencia', 'referência', 'nro:', 'loja',
  'emissão', 'emissao', 'bolsa nif',
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

/**
 * Classifica uma linha de texto por tipo.
 * Usado para separar produtos de linhas fiscais/administrativas.
 */
function classificarTipoLinha(linha: string): TipoLinha {
  const lower = linha.toLowerCase()
  const upper = linha.toUpperCase().trim()

  // IVA: taxa explícita PT (6%, 13%, 23%) ou keyword 'iva'
  // Ignora percentagens neutras como '0%' embebidas em linhas de produto
  if (/\b(23|13|6)[,.]?\d*\s*%/.test(lower) || /\biva\b/.test(lower)) return 'iva'
  // Linha fiscal com prefixo (C)/(I) e conteúdo só numérico/percentagem
  if (/^\([A-Z€I]\)\s*[\d.,\s%]+$/i.test(linha.trim())) return 'iva'

  // Total/subtotal
  if (STOP_PRODUCT_RE.some(re => re.test(linha))) return 'total'

  // Pagamentos
  if (PAG_KEYWORDS.some(k => lower.includes(k))) return 'pagamento'

  // Depósito/tara
  if (DEP_KEYWORDS.some(k => lower.includes(k))) return 'deposito'

  // Desconto/promoção
  if (DESC_KEYWORDS.some(k => lower.includes(k))) return 'desconto'

  // NS + só números → linha fiscal (ex: "NS 0,30 0,00")
  if (/^NS\s+[\d\s.,]+$/i.test(upper)) return 'iva'

  // Linha só com números/pontuação
  if (/^[\d\s.,]+$/.test(linha.trim())) return 'administrativo'

  // Prefixo fiscal + só números ex: "(€) 1,23 4,56" sem texto
  if (/^\([A-Z€]\)\s*[\d\s.,]+$/.test(upper)) return 'administrativo'

  // Administrativo (dados de loja, contactos, etc.)
  if (ADMIN_KEYWORDS.some(kw => lower.includes(kw))) return 'administrativo'

  return 'produto'
}

function isStopLine(linha: string): boolean {
  return STOP_PRODUCT_RE.some(re => re.test(linha))
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

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
  { pattern: /\bgalp\b/i,                    nome: 'Galp' },
  { pattern: /\brepsol\b/i,                  nome: 'Repsol' },
  { pattern: /\bbp\b/i,                      nome: 'BP' },
]

// ── Padrões de quantidade ──────────────────────────────────────────────────────

const RE_QTD_INT      = /^(.*?)\s+(\d+)\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/
const RE_QTD_KG       = /^(.*?)\s+(\d+[,.]\d{3,})\s*kg\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/i
const RE_QTD_ONLY     = /^(\d+)\s*[xX]\s*(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s*$/
const RE_SIMPLES_2SP  = /^(.+?)\s{2,}(\d+[,.]\d{2})\s*$/
const RE_SIMPLES_1SP  = /^(.+)\s+(\d+[,.]\d{2})\s*$/
// Combustível: "10,59 Lit x 1,889 EUR/Lit 20,00 EUR"
const RE_COMBUSTIVEL  = /^(\d+[,.]\d+)\s*Lit\s+[xX]\s+(\d+[,.]\d+)\s*EUR\/Lit\s+(\d+[,.]\d{2})\s*(?:EUR)?\s*$/i

/**
 * Remove prefixos fiscais e prefixo de quantidade Auchan (ex: "1 PRODUTO") de início de linha.
 * Ex: "(C) PRODUTO" → "PRODUTO", "NS PRODUTO" → "PRODUTO", "1 RUM BACARDI" → "RUM BACARDI"
 */
function stripFiscalPrefix(s: string): string {
  return s
    .replace(/^\([A-Z€]\)\s*/i, '')                                     // (C), (I), (E), (€)
    .replace(/^NS\s+/i, '')                                              // NS (Não Sujeito)
    .replace(/^(\d{1,2})\s+(?=[A-Za-záàâãéêíóôõúüç])/i, '')            // "1 " ou "12 " antes de letra
    .trim()
}

function titularize(s: string): string {
  return s.toLowerCase().replace(/\b([a-záàâãéêíóôõúüç])/g, c => c.toUpperCase())
}

/**
 * Tenta extrair dados de formato (nome, qtd, preço) de uma linha.
 * Não faz classificação de tipo — isso é responsabilidade do chamador.
 */
function parsearLinhaFormato(
  linha: string
): Omit<LinhaParsed, 'tipo_linha' | 'categoria_linha'> | null {
  const limpa = linha.trim().replace(/\s+/g, ' ')
  if (!limpa || limpa.length < 3) return null

  if (encontrarMonetarios(limpa).length === 0) return null

  const nomeLimpo = (raw: string) => titularize(stripFiscalPrefix(raw))

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

// ── Detecção de campos globais ─────────────────────────────────────────────────

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
  // Palavras de método de pagamento — a evitar para não confundir com o total
  const AVOID = [
    'pago', 'recebido', 'recebemos', 'troco', 'cartão', 'cartao', 'card',
    'mb way', 'mbway', 'multibanco', 'visa', 'sibs', 'numerário', 'numerario',
  ]

  function tryExtract(linha: string): number | null {
    if (AVOID.some(w => linha.toLowerCase().includes(w))) return null
    const vals = encontrarMonetarios(linha)
    return vals.length > 0 ? Math.max(...vals) : null
  }

  const reversed = [...linhas].reverse()

  // Prioridade 1: "TOTAL A PAGAR" / "VALOR A PAGAR" / "MONTANTE A PAGAR"
  for (const l of reversed) {
    if (/total\s+a\s+pagar|valor\s+a\s+pagar|montante\s+a\s+pagar/i.test(l)) {
      const v = tryExtract(l); if (v !== null) return v
    }
  }
  // Prioridade 2: "TOTAL:" ou "TOTAL " (inclui "TOTAL:6.98€")
  for (const l of reversed) {
    if (/\btotal[:\s]/i.test(l) || /\btotal\s*$/i.test(l)) {
      const v = tryExtract(l); if (v !== null) return v
    }
  }
  // Prioridade 3: TOTAL em qualquer posição, MONTANTE, A PAGAR
  for (const l of reversed) {
    if (/\btotal\b/i.test(l) || /\bmontante\b/i.test(l) || /a\s+pagar/i.test(l)) {
      const v = tryExtract(l); if (v !== null) return v
    }
  }
  return null
}

function extractNif(texto: string): { nif: string | null; linha: string | null } {
  const linhas = texto.split('\n')

  // Padrões ordenados por especificidade (keyword explícita primeiro)
  const NIF_RES: RegExp[] = [
    /NIF[:\s#]*(?:PT)?\s*([1235689]\d{8})\b/i,
    /N[º°o]?\s*\.?\s*Contribuinte[:\s#]*(?:PT)?\s*([1235689]\d{8})\b/i,
    /N\.?\s*Contrib\.?[:\s#]*(?:PT)?\s*([1235689]\d{8})\b/i,
    /No\.?\s*Cont\.?[:\s#]*(?:PT)?\s*([1235689]\d{8})\b/i,
    /Contribuinte[:\s#]*(?:PT)?\s*([1235689]\d{8})\b/i,
    /\bPT([1235689]\d{8})\b/,
  ]

  for (const re of NIF_RES) {
    for (const l of linhas) {
      const m = l.match(re)
      if (m) return { nif: m[1], linha: l.trim() }
    }
  }

  return { nif: null, linha: null }
}

// ── Função principal ───────────────────────────────────────────────────────────

export function parsearFatura(textoBruto: string): OcrResultado {
  const linhas = textoBruto.split('\n').map(l => l.trim()).filter(Boolean)

  const fornecedor = detectarFornecedor(linhas)
  const data_detectada = detectarData(textoBruto)
  const total_detectado = detectarTotal(linhas)
  const { nif: nif_detectado, linha: nif_linha_original } = extractNif(textoBruto)

  const linhasParsed: LinhaParsed[] = []     // tipo = 'produto'
  const linhasEspeciais: LinhaParsed[] = []  // deposito, iva, total, pagamento, desconto

  let pendingNome: string | null = null
  let pendingTipo: TipoLinha = 'produto'

  for (const linha of linhas) {
    const limpa = linha.trim().replace(/\s+/g, ' ')
    if (!limpa) continue

    // Parar ao encontrar linha de total — regista-a em linhasEspeciais
    if (isStopLine(limpa)) {
      const parsed = parsearLinhaFormato(limpa)
      if (parsed && parsed.preco_total !== null) {
        linhasEspeciais.push({ ...parsed, tipo_linha: 'total', categoria_linha: null })
      }
      pendingNome = null
      break
    }

    const tipo = classificarTipoLinha(limpa)

    // Linhas puramente administrativas: ignorar completamente
    if (tipo === 'administrativo') {
      pendingNome = null
      pendingTipo = 'produto'
      continue
    }

    // Combustível: "10,59 Lit x 1,889 EUR/Lit 20,00 EUR"
    // Combina com o nome pendente da linha anterior (ex: "E5-TOP 95")
    const mComb = limpa.match(RE_COMBUSTIVEL)
    if (mComb) {
      const nome = pendingNome ? titularize(pendingNome) : 'Combustível'
      linhasParsed.push({
        texto_linha_original: limpa,
        nome_produto_bruto: nome,
        quantidade: parseMoney(mComb[1]),
        unidade: 'L',
        preco_unitario: parseMoney(mComb[2]),
        preco_total: parseMoney(mComb[3]),
        confianca: 'alta',
        tipo_linha: 'produto',
        categoria_linha: null,
      })
      pendingNome = null
      pendingTipo = 'produto'
      continue
    }

    // Linha de quantidade isolada: "2 X 1,75 3,50" — combina com pendingNome
    const mQtdOnly = limpa.match(RE_QTD_ONLY)
    if (mQtdOnly && pendingNome) {
      const combined = `${pendingNome} ${limpa}`
      const parsed = parsearLinhaFormato(combined)
      if (parsed && parsed.preco_total !== null) {
        const lf: LinhaParsed = { ...parsed, tipo_linha: pendingTipo, categoria_linha: null }
        if (pendingTipo === 'produto') linhasParsed.push(lf)
        else linhasEspeciais.push(lf)
      }
      pendingNome = null
      pendingTipo = 'produto'
      continue
    }

    const parsed = parsearLinhaFormato(limpa)

    if (parsed && parsed.preco_total !== null) {
      const lf: LinhaParsed = { ...parsed, tipo_linha: tipo, categoria_linha: null }
      if (tipo === 'produto') linhasParsed.push(lf)
      else linhasEspeciais.push(lf)
      pendingNome = null
      pendingTipo = 'produto'
    } else {
      // Sem preço — pode ser nome de produto que continua na linha seguinte
      if (encontrarMonetarios(limpa).length === 0 && limpa.length >= 3) {
        const stripped = stripFiscalPrefix(limpa).replace(/:$/, '').trim()
        if (stripped.length >= 3) {
          pendingNome = stripped
          pendingTipo = tipo
        } else {
          pendingNome = null
          pendingTipo = 'produto'
        }
      } else {
        pendingNome = null
        pendingTipo = 'produto'
      }
    }
  }

  // Remove duplicados apenas quando o texto original E o preço total são exatamente iguais
  // (duplicado real de OCR). Produtos iguais com preços ou quantidades diferentes são mantidos.
  const semDuplicados = linhasParsed.filter(
    (l, i, arr) => arr.findIndex(
      x => x.texto_linha_original === l.texto_linha_original &&
           x.preco_total === l.preco_total
    ) === i
  )
  const especiaisSemDup = linhasEspeciais.filter(
    (l, i, arr) => arr.findIndex(
      x => x.texto_linha_original === l.texto_linha_original &&
           x.preco_total === l.preco_total
    ) === i
  )

  return {
    texto_bruto: textoBruto,
    total_detectado,
    fornecedor,
    data_detectada,
    nif_detectado,
    nif_linha_original,
    linhas: semDuplicados,
    linhasEspeciais: especiaisSemDup,
  }
}
