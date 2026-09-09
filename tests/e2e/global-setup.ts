/**
 * FASE 2 (E2E) — setup global: cria DOIS conjuntos de fixtures independentes
 * e grava o manifest que os specs e o teardown consultam.
 *
 * 1. Campos "legacy" (`tests/e2e/lib/e2e-fixtures.ts`) — para os fluxos de
 *    Adjunto que hoje em produção usam `legacy_anon_access`, não sessão
 *    Supabase Auth (devoluções, regularização NIF, Danger Zone).
 * 2. Fixtures de role (`tests/security/fixtures.ts` — mesmas usadas pela
 *    matriz DB-level) — para as poucas rotas que JÁ são conscientes de
 *    sessão (`/admin/memberships`), materializadas como `storageState` do
 *    Playwright (cookie `@supabase/ssr`, ver `lib/session-cookies.ts`).
 *    NUNCA usa `service_role`; a sessão vem de `signInWithPassword` com a
 *    chave anon, tal como um utilizador real autenticaria.
 *
 * Corre uma única vez por execução `npm run test:e2e`. Se falhar a meio,
 * limpa o que já tiver criado antes de propagar o erro.
 */
import path from 'node:path'
import fs from 'node:fs'
import { assertAuthorizedProject, assertTestCampId } from './lib/guardrails'
import { createE2ECampFixtures, teardownE2ECampFixtures, type E2ECampFixtures } from './lib/e2e-fixtures'
import { createFixtures, teardownFixtures, type CreatedFixtures, type FixtureRoleKey } from '../security/fixtures'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from '../security/env'
import { buildAuthCookies } from './lib/session-cookies'

export const STATE_DIR = path.join(__dirname, '.auth')
export const MANIFEST_PATH = path.join(STATE_DIR, 'manifest.json')

export interface E2EManifest extends E2ECampFixtures {
  roleFixtures: { camps: CreatedFixtures['camps']; userIds: CreatedFixtures['userIds'] }
}

async function globalSetup() {
  assertAuthorizedProject()
  fs.mkdirSync(STATE_DIR, { recursive: true })

  let campFixtures: E2ECampFixtures
  try {
    campFixtures = createE2ECampFixtures()
  } catch (err) {
    console.error('[e2e global-setup] createE2ECampFixtures falhou:', err)
    throw err
  }

  let roleFixtures: CreatedFixtures
  try {
    if (!PRODUCTION_URL || !PRODUCTION_ANON_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL/ANON_KEY em falta — não é possível autenticar fixtures de role.')
    }
    roleFixtures = await createFixtures({ url: PRODUCTION_URL, anonKey: PRODUCTION_ANON_KEY, serviceRoleKey: undefined })
  } catch (err) {
    console.error('[e2e global-setup] createFixtures (roles) falhou — a limpar os campos legacy antes de propagar:', err)
    try {
      teardownE2ECampFixtures(campFixtures)
    } catch (teardownErr) {
      console.error('[e2e global-setup] teardown de emergência (campos legacy) também falhou:', teardownErr)
    }
    throw err
  }

  try {
    assertTestCampId(campFixtures.campA.id)
    assertTestCampId(campFixtures.campB.id)
    assertTestCampId(campFixtures.closedCamp.id)
    assertTestCampId(roleFixtures.camps.campA)
    assertTestCampId(roleFixtures.camps.campB)

    // storageState por role — só para quem alguma página session-aware
    // (/admin/memberships) precisa realmente de reconhecer no browser.
    const domain = new URL(process.env.E2E_BASE_URL ?? 'https://direction-camtil.vercel.app').hostname
    for (const role of Object.keys(roleFixtures.clients) as FixtureRoleKey[]) {
      const client = roleFixtures.clients[role]
      const { data, error } = await client.auth.getSession()
      if (error || !data.session) throw new Error(`Sessão em falta para a fixture '${role}': ${error?.message ?? 'sem sessão'}`)
      const cookies = buildAuthCookies(data.session, PRODUCTION_URL, domain)
      // Todo o /admin/* tem, ADICIONALMENTE, um gate legacy por PIN
      // (src/app/admin/layout.tsx, cookie `admin_auth`) que coexiste
      // deliberadamente com a sessão Supabase Auth — sem isto, nenhuma
      // fixture (nem a admin) passaria do ecrã de PIN para testar a
      // autorização por global_role. Reproduz aqui os mesmos atributos de
      // src/app/admin/actions.ts (nunca lê nem precisa do ADMIN_PIN real —
      // só define o cookie que o layout já confia cegamente).
      cookies.push({
        name: 'admin_auth',
        value: 'true',
        domain,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      })
      fs.writeFileSync(path.join(STATE_DIR, `${role}.json`), JSON.stringify({ cookies, origins: [] }, null, 2))
    }

    const manifest: E2EManifest = {
      ...campFixtures,
      roleFixtures: { camps: roleFixtures.camps, userIds: roleFixtures.userIds },
    }
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))

    console.log(
      `[e2e global-setup] fixtures prontas — Camp A="${campFixtures.campA.nome}" Camp B="${campFixtures.campB.nome}" ` +
        `Closed="${campFixtures.closedCamp.nome}" | role fixtures: campA=${roleFixtures.camps.campA} campB=${roleFixtures.camps.campB}`
    )
  } catch (err) {
    console.error('[e2e global-setup] falha depois de criar fixtures — a limpar tudo antes de propagar:', err)
    try {
      teardownE2ECampFixtures(campFixtures)
    } catch (teardownErr) {
      console.error('[e2e global-setup] teardown de emergência (campos legacy) também falhou:', teardownErr)
    }
    try {
      await teardownFixtures(roleFixtures)
    } catch (teardownErr) {
      console.error('[e2e global-setup] teardown de emergência (fixtures de role) também falhou:', teardownErr)
    }
    throw err
  }
}

export default globalSetup
