/**
 * FASE 2 (E2E) — fixtures de campo para os fluxos de Adjunto (devoluções,
 * regularização NIF, despesas).
 *
 * Por que não reutiliza `tests/security/fixtures.ts` (adjunto_A/B com
 * camp_memberships + sessão OTP-equivalente): o fluxo real de Adjunto em
 * produção, hoje, NÃO passa por login Supabase Auth — usa PIN de campo +
 * a excepção `legacy_anon_access` (decisão "todos os 11 campos, por agora").
 * As páginas de leitura (`src/lib/supabase/server.ts`) usam um cliente anon
 * simples, não consciente de cookies/sessão — por isso, mesmo um utilizador
 * de teste autenticado via `camp_memberships` NUNCA conseguiria carregar
 * `/campo/[id]/adjuntos/*` num campo sem `legacy_anon_access=true` (a
 * leitura falha por RLS antes de a sessão ter qualquer efeito). Testar o
 * fluxo real de Adjunto tem de replicar exactamente essa condição, ou o
 * teste não testa o que corre em produção.
 *
 * Fixtures criadas (nomenclatura sugerida pelo utilizador):
 *   - "[TEST] E2E Camp A <runId>" / "[TEST] E2E Camp B <runId>":
 *     legacy_anon_access=true, sem PIN — mesmo mecanismo dos 11 campos reais.
 *   - "[TEST] E2E Closed Camp <runId>": legacy_anon_access=false (omitido) —
 *     usado só para confirmar que a RLS continua a fechar por omissão.
 *
 * Nunca usa `service_role`. Nunca toca nos 11 campos reais (nomes fixos,
 * nunca consultados por padrão aqui).
 */
import { runSql } from '../../security/sql'

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

export interface E2ECampFixtures {
  runId: string
  campA: { id: string; nome: string }
  campB: { id: string; nome: string }
  closedCamp: { id: string; nome: string }
}

export function createE2ECampFixtures(): E2ECampFixtures {
  const runId = Math.random().toString(36).slice(2, 8)
  const created: string[] = []

  try {
    const campA = insertCamp(`[TEST] E2E Camp A ${runId}`, true)
    created.push(campA)
    const campB = insertCamp(`[TEST] E2E Camp B ${runId}`, true)
    created.push(campB)
    const closedCamp = insertCamp(`[TEST] E2E Closed Camp ${runId}`, false)
    created.push(closedCamp)

    return {
      runId,
      campA: { id: campA, nome: `[TEST] E2E Camp A ${runId}` },
      campB: { id: campB, nome: `[TEST] E2E Camp B ${runId}` },
      closedCamp: { id: closedCamp, nome: `[TEST] E2E Closed Camp ${runId}` },
    }
  } catch (err) {
    if (created.length > 0) {
      runSql(`delete from campos where id in (${created.map(lit).join(',')});`)
    }
    throw err
  }
}

function insertCamp(nome: string, legacyAnonAccess: boolean): string {
  const rows = runSql(`
    insert into campos (nome, escalao, ano, setup_completo, saldo_inicial, legacy_anon_access)
    values (${lit(nome)}, 'Aranhiço', 9999, true, 1000, ${legacyAnonAccess})
    returning id::text as id;
  `)
  return rows[0].id as string
}

/** Apaga só os IDs desta corrida (cascata remove despesas/devoluções/etc.); confirma por leitura. */
export function teardownE2ECampFixtures(fixtures: E2ECampFixtures): void {
  const ids = [fixtures.campA.id, fixtures.campB.id, fixtures.closedCamp.id]
  runSql(`delete from campos where id in (${ids.map(lit).join(',')});`)

  const remaining = runSql(`select id::text as id, nome from campos where id in (${ids.map(lit).join(',')});`)
  if (remaining.length > 0) {
    throw new Error(
      `teardownE2ECampFixtures: ${remaining.length} campo(s) [TEST] NÃO foram apagados: ${JSON.stringify(remaining)}`
    )
  }
}

/** Rede de segurança independente de uma corrida: encontra qualquer campo "[TEST] E2E" que tenha sobrado. */
export function findOrphanedE2ECamps() {
  return runSql(`select id::text as id, nome from campos where nome like '[TEST] E2E %';`)
}

export function sweepOrphanedE2ECamps(): number {
  const orphans = findOrphanedE2ECamps()
  if (orphans.length > 0) {
    runSql(`delete from campos where nome like '[TEST] E2E %';`)
  }
  return orphans.length
}
