/**
 * FASE 2 (E2E) — guardrails técnicos de produção.
 *
 * "Quero guardrails técnicos, não apenas comentários" — cada função aqui
 * FALHA (throw), nunca apenas avisa, quando a condição de segurança não se
 * verifica. Chamado obrigatoriamente antes de qualquer operação destrutiva
 * de E2E (criar/editar/apagar despesas, devoluções, regularizações,
 * Storage, ou a Danger Zone).
 */
import { PRODUCTION_URL, PRODUCTION_HOSTNAME } from '../../security/env'
import { runSql } from '../../security/sql'
import { projectRefFromUrl } from './session-cookies'

/** O único projeto Supabase autorizado para esta suite (ver AGENTS/CLAUDE + memória do projeto). */
export const AUTHORIZED_PROJECT_REF = 'szntdkykqmsofgcwrsrt'

/**
 * Confirma que o projeto Supabase alvo é exatamente o autorizado. Nunca
 * infere isto de env vars "parecidas" — falha se NEXT_PUBLIC_SUPABASE_URL
 * não resolver para o ref esperado.
 */
export function assertAuthorizedProject(): void {
  if (!PRODUCTION_URL) {
    throw new Error('GUARDRAIL: NEXT_PUBLIC_SUPABASE_URL não está definido — recuso continuar sem saber o alvo.')
  }
  const ref = projectRefFromUrl(PRODUCTION_URL)
  if (ref !== AUTHORIZED_PROJECT_REF) {
    throw new Error(
      `GUARDRAIL: projeto Supabase alvo ("${ref}") não é o projeto autorizado ` +
        `("${AUTHORIZED_PROJECT_REF}"). A suite E2E recusa-se a correr contra qualquer outro projeto ` +
        `(inclui os outros projetos não relacionados na mesma conta: "Adjuntos", "Mamãs", etc.).`
    )
  }
}

/**
 * Nomes exatos (lowercase, sem acentos/trim já aplicado pela BD) dos 11
 * campos reais históricos — carregados dinamicamente da BD (nunca
 * hardcoded aqui como lista estática, que podia ficar desatualizada), para
 * nunca poderem ser aceites como alvo de uma operação destrutiva de E2E.
 */
let cachedRealCampIds: Set<string> | null = null

export function loadRealCampIds(): Set<string> {
  if (cachedRealCampIds) return cachedRealCampIds
  const rows = runSql(`select id::text as id from campos where nome not like '[TEST]%';`)
  cachedRealCampIds = new Set(rows.map((r) => r.id as string))
  return cachedRealCampIds
}

/**
 * ÚNICA forma sancionada de validar um camp_id antes de uma operação
 * destrutiva de E2E: tem de (a) não estar na lista de campos reais
 * (carregada da BD, não de memória/config) e (b) ter o nome a começar
 * literalmente por "[TEST]" na BD neste preciso momento — não confia no
 * `id` vir de uma fixture já validada há minutos, revalida sempre.
 */
export function assertTestCampId(campId: string): void {
  const real = loadRealCampIds()
  if (real.has(campId)) {
    throw new Error(
      `GUARDRAIL: camp_id ${campId} corresponde a um dos campos REAIS históricos — ` +
        `recusado como alvo de operação destrutiva de E2E.`
    )
  }
  const rows = runSql(`select nome from campos where id = '${campId.replace(/'/g, "''")}';`)
  if (rows.length === 0) {
    throw new Error(`GUARDRAIL: camp_id ${campId} não existe na BD — nada para validar, recusado.`)
  }
  const nome = rows[0].nome as string
  if (!nome.startsWith('[TEST]')) {
    throw new Error(
      `GUARDRAIL: camp_id ${campId} tem nome "${nome}", que não começa por "[TEST]" — ` +
        `recusado como alvo de operação destrutiva de E2E (só fixtures marcadas explicitamente são aceites).`
    )
  }
}

/** Idem para o hostname da app que os testes de browser vão visitar. */
export function assertAppHostname(baseURL: string): void {
  const allowed = process.env.E2E_ALLOWED_HOSTNAME
  const host = new URL(baseURL).hostname
  if (allowed && host !== allowed) {
    throw new Error(`GUARDRAIL: baseURL "${host}" não corresponde a E2E_ALLOWED_HOSTNAME ("${allowed}").`)
  }
  if (host === 'localhost' || host === '127.0.0.1') return
  // Produção é o único alvo remoto conhecido desta app — qualquer outro
  // domínio remoto é rejeitado por omissão, salvo configuração explícita.
  if (!allowed && PRODUCTION_HOSTNAME && !host.endsWith('.vercel.app') && host !== PRODUCTION_HOSTNAME) {
    throw new Error(
      `GUARDRAIL: baseURL "${host}" não é reconhecido (nem localhost, nem *.vercel.app, nem o hostname de produção conhecido). ` +
        `Define E2E_ALLOWED_HOSTNAME explicitamente se isto for intencional.`
    )
  }
}
