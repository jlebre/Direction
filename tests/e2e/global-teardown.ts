/**
 * FASE 2 (E2E) — teardown global: apaga os campos de teste (cascata remove
 * despesas/devoluções/regularizações/liquidações) e os ficheiros de Storage
 * criados sob os seus slugs. Corre sempre, mesmo que um teste falhe.
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from '../security/env'
import { teardownFixtures, findOrphanedTestFixtures } from '../security/fixtures'
import { teardownE2ECampFixtures, findOrphanedE2ECamps } from './lib/e2e-fixtures'
import { runSql } from '../security/sql'
import { STATE_DIR, MANIFEST_PATH, type E2EManifest } from './global-setup'

// Tem de replicar exactamente `getCampoSlug()` (src/lib/adjuntos/supabase-storage.ts)
// — nunca importar de `src/` diretamente aqui (este ficheiro corre fora do
// runtime Next.js), por isso duplica a lógica; qualquer alteração a uma
// tem de ser espelhada na outra (ver teste de regressão em tests/unit/).
function slugOf(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function cleanupStorageFolder(slug: string) {
  if (!PRODUCTION_URL || !PRODUCTION_ANON_KEY) return
  const supabase = createClient(PRODUCTION_URL, PRODUCTION_ANON_KEY)
  const { data: files, error } = await supabase.storage.from('faturas').list(slug)
  if (error || !files || files.length === 0) return
  const paths = files.map((f) => `${slug}/${f.name}`)
  const { error: removeErr } = await supabase.storage.from('faturas').remove(paths)
  if (removeErr) {
    throw new Error(`[e2e global-teardown] falha ao remover ficheiros de Storage em "${slug}": ${removeErr.message}`)
  }
  console.log(`[e2e global-teardown] Storage: removidos ${paths.length} ficheiro(s) de "${slug}"`)
}

async function globalTeardown() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn('[e2e global-teardown] sem manifest — global-setup não chegou a correr ou já foi limpo.')
    return
  }
  const manifest: E2EManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

  await cleanupStorageFolder(slugOf(manifest.campA.nome))
  await cleanupStorageFolder(slugOf(manifest.campB.nome))
  await cleanupStorageFolder(slugOf(manifest.closedCamp.nome))

  teardownE2ECampFixtures(manifest)

  // Fixtures de role (tests/security/fixtures.ts) — nomes não vêm no
  // manifest (só os IDs), lidos aqui só para limpar Storage (a BD é
  // limpa por teardownFixtures, que apaga por ID, nunca por nome).
  const roleCampRows = runSql(
    `select id::text as id, nome from campos where id in ('${manifest.roleFixtures.camps.campA}','${manifest.roleFixtures.camps.campB}');`
  )
  for (const row of roleCampRows) {
    await cleanupStorageFolder(slugOf(row.nome as string))
  }
  await teardownFixtures(manifest.roleFixtures)

  const orphanCamps = findOrphanedE2ECamps()
  const orphanRoleFixtures = findOrphanedTestFixtures()
  if (orphanCamps.length > 0 || orphanRoleFixtures.camps.length > 0 || orphanRoleFixtures.users.length > 0) {
    throw new Error(
      `[e2e global-teardown] sobraram fixtures [TEST] depois do teardown — intervenção manual necessária: ` +
        JSON.stringify({ orphanCamps, orphanRoleFixtures })
    )
  }

  fs.rmSync(STATE_DIR, { recursive: true, force: true })
  console.log('[e2e global-teardown] fixtures removidas — 0 residuais confirmado.')
}

export default globalTeardown
