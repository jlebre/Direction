/**
 * FASE 2 (E2E) — setup global: cria os campos de teste (ver
 * `tests/e2e/lib/e2e-fixtures.ts` para porque esta suite usa
 * `legacy_anon_access`, não sessões Supabase Auth, para os fluxos de
 * Adjunto) e grava o manifest que os specs e o teardown consultam.
 *
 * Corre uma única vez por execução `npm run test:e2e`. Se falhar a meio,
 * limpa o que já tiver criado antes de propagar o erro.
 */
import path from 'node:path'
import fs from 'node:fs'
import { assertAuthorizedProject, assertTestCampId } from './lib/guardrails'
import { createE2ECampFixtures, teardownE2ECampFixtures, type E2ECampFixtures } from './lib/e2e-fixtures'

export const STATE_DIR = path.join(__dirname, '.auth')
export const MANIFEST_PATH = path.join(STATE_DIR, 'manifest.json')

export type E2EManifest = E2ECampFixtures

async function globalSetup() {
  assertAuthorizedProject()
  fs.mkdirSync(STATE_DIR, { recursive: true })

  let fixtures: E2ECampFixtures
  try {
    fixtures = createE2ECampFixtures()
  } catch (err) {
    console.error('[e2e global-setup] createE2ECampFixtures falhou:', err)
    throw err
  }

  try {
    assertTestCampId(fixtures.campA.id)
    assertTestCampId(fixtures.campB.id)
    assertTestCampId(fixtures.closedCamp.id)

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(fixtures, null, 2))
    console.log(
      `[e2e global-setup] fixtures prontas — Camp A="${fixtures.campA.nome}" Camp B="${fixtures.campB.nome}" ` +
        `Closed="${fixtures.closedCamp.nome}"`
    )
  } catch (err) {
    console.error('[e2e global-setup] falha depois de criar fixtures — a limpar antes de propagar:', err)
    try {
      teardownE2ECampFixtures(fixtures)
    } catch (teardownErr) {
      console.error('[e2e global-setup] teardown de emergência também falhou:', teardownErr)
    }
    throw err
  }
}

export default globalSetup
