/**
 * `npm run test:e2e:cleanup` — rede de segurança independente de qualquer
 * corrida específica. Corre mesmo que uma suite E2E tenha morrido antes do
 * seu próprio global-teardown (processo matado, timeout, crash) e por isso
 * nunca deve depender de um manifest de uma corrida em concreto.
 *
 * Varre por PADRÃO (nunca por ID de uma corrida) e apaga:
 *   - campos com nome a começar por "[TEST]" (cascata: despesas/devoluções/
 *     regularizações/liquidações desses campos)
 *   - auth.users com email a terminar em "@camtil.invalid"
 *   - pastas no bucket "faturas" cujo nome (slug) começa por "[test]-camp-"
 *
 * Seguro de correr mesmo com 0 fixtures pendentes (idempotente, reporta
 * "nada a limpar").
 */
import { createClient } from '@supabase/supabase-js'
import { sweepOrphanedTestFixtures, findOrphanedTestFixtures } from '../tests/security/fixtures'
import { sweepOrphanedE2ECamps, findOrphanedE2ECamps } from '../tests/e2e/lib/e2e-fixtures'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from '../tests/security/env'
import { assertAuthorizedProject } from '../tests/e2e/lib/guardrails'

async function sweepStorage() {
  if (!PRODUCTION_URL || !PRODUCTION_ANON_KEY) return { removed: 0 }
  const supabase = createClient(PRODUCTION_URL, PRODUCTION_ANON_KEY)
  const { data: rootEntries, error } = await supabase.storage.from('faturas').list('')
  if (error || !rootEntries) return { removed: 0 }

  // getCampoSlug() sanea "[", "]" e similares antes de virarem prefixo de
  // pasta no Storage (achado da suite E2E — ver supabase-storage.ts) — por
  // isso o padrão aqui é "test-", não "[test]-". Cobre ambas as fixtures:
  // "test-camp-*" (tests/security/fixtures.ts) e "test-e2e-camp-*"/
  // "test-e2e-closed-camp-*" (tests/e2e/lib/e2e-fixtures.ts).
  const testFolders = rootEntries.filter((e) => e.name.startsWith('test-') && e.id === null)
  let removed = 0
  for (const folder of testFolders) {
    const { data: files } = await supabase.storage.from('faturas').list(folder.name)
    if (files && files.length > 0) {
      const paths = files.map((f) => `${folder.name}/${f.name}`)
      const { error: removeErr } = await supabase.storage.from('faturas').remove(paths)
      if (!removeErr) removed += paths.length
    }
  }
  return { removed, folders: testFolders.length }
}

async function main() {
  assertAuthorizedProject()

  console.log('[e2e:cleanup] a verificar fixtures [TEST] órfãs antes de limpar...')
  const before = findOrphanedTestFixtures()
  const beforeE2E = findOrphanedE2ECamps()
  console.log(
    `[e2e:cleanup] encontradas: ${before.camps.length} camp(s) RLS-matrix, ${before.users.length} user(s), ` +
      `${beforeE2E.length} camp(s) E2E`
  )

  const dbResult = sweepOrphanedTestFixtures()
  const e2eCampsRemoved = sweepOrphanedE2ECamps()
  const storageResult = await sweepStorage()

  console.log(
    `[e2e:cleanup] BD: ${dbResult.campsRemoved + e2eCampsRemoved} camp(s) e ${dbResult.usersRemoved} user(s) removido(s). ` +
      `Storage: ${storageResult.removed} ficheiro(s) removido(s) em ${storageResult.folders ?? 0} pasta(s) [TEST].`
  )

  const after = findOrphanedTestFixtures()
  const afterE2E = findOrphanedE2ECamps()
  if (after.camps.length > 0 || after.users.length > 0 || afterE2E.length > 0) {
    console.error(
      '[e2e:cleanup] AINDA sobram fixtures depois da limpeza:',
      JSON.stringify({ ...after, e2eCamps: afterE2E }, null, 2)
    )
    process.exit(1)
  }
  console.log('[e2e:cleanup] 0 fixtures [TEST] residuais confirmado.')
}

main().catch((err) => {
  console.error('[e2e:cleanup] falhou:', err)
  process.exit(1)
})
