/**
 * FASE 2.8 (fecho — leituras session-aware) — `/campo/[id]/adjuntos/*`
 * passou a usar `createSessionServerClient()` (cookie-aware) em vez do
 * cliente anon simples (`src/lib/supabase/server.ts`). Este spec confirma,
 * via browser real com sessão Supabase Auth injectada, que uma
 * `camp_membership` real agora tem efeito na LEITURA destas páginas — não
 * só na escrita (Server Actions, já coberto desde a subfase 2.6).
 *
 * Usa os campos de role (`manifest.roleFixtures.camps.campA/campB` — ver
 * tests/security/fixtures.ts) que NÃO têm `legacy_anon_access` (default
 * false): é o limite real e definitivo (camp_membership), não a exceção
 * legacy que os 11 campos reais ainda usam. Testa também manipulação de
 * `camp_id` na URL (trocar A por B usando a mesma sessão).
 */
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { MANIFEST_PATH, type E2EManifest } from './global-setup'

const AUTH_DIR = path.join(__dirname, '.auth')

let manifest: E2EManifest

test.beforeAll(() => {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
})

async function readAdjuntosDashboard(browser: import('@playwright/test').Browser, storageStateFile: string | undefined, campId: string) {
  const context = await browser.newContext(storageStateFile ? { storageState: path.join(AUTH_DIR, storageStateFile) } : {})
  const page = await context.newPage()
  const response = await page.goto(`/campo/${campId}/adjuntos`)
  const status = response?.status() ?? 0
  await context.close()
  return status
}

test.describe('Leituras session-aware — /campo/[id]/adjuntos (campos SEM legacy_anon_access)', () => {
  test('adjunto_A: Camp A (seu) -> 200; Camp B (outro) -> 404', async ({ browser }) => {
    const statusOwn = await readAdjuntosDashboard(browser, 'adjunto_A.json', manifest.roleFixtures.camps.campA)
    const statusOther = await readAdjuntosDashboard(browser, 'adjunto_A.json', manifest.roleFixtures.camps.campB)
    expect(statusOwn).toBe(200)
    expect(statusOther).toBe(404)
  })

  test('field_viewer_A: Camp A (seu) -> 200; Camp B (outro) -> 404', async ({ browser }) => {
    const statusOwn = await readAdjuntosDashboard(browser, 'field_viewer_A.json', manifest.roleFixtures.camps.campA)
    const statusOther = await readAdjuntosDashboard(browser, 'field_viewer_A.json', manifest.roleFixtures.camps.campB)
    expect(statusOwn).toBe(200)
    expect(statusOther).toBe(404)
  })

  test('treasurer: Camp A e Camp B -> 200 (sem membership em nenhum)', async ({ browser }) => {
    const statusA = await readAdjuntosDashboard(browser, 'treasurer.json', manifest.roleFixtures.camps.campA)
    const statusB = await readAdjuntosDashboard(browser, 'treasurer.json', manifest.roleFixtures.camps.campB)
    expect(statusA).toBe(200)
    expect(statusB).toBe(200)
  })

  test('viewer: Camp A e Camp B -> 200', async ({ browser }) => {
    const statusA = await readAdjuntosDashboard(browser, 'viewer.json', manifest.roleFixtures.camps.campA)
    const statusB = await readAdjuntosDashboard(browser, 'viewer.json', manifest.roleFixtures.camps.campB)
    expect(statusA).toBe(200)
    expect(statusB).toBe(200)
  })

  test('admin: Camp A e Camp B -> 200', async ({ browser }) => {
    const statusA = await readAdjuntosDashboard(browser, 'admin.json', manifest.roleFixtures.camps.campA)
    const statusB = await readAdjuntosDashboard(browser, 'admin.json', manifest.roleFixtures.camps.campB)
    expect(statusA).toBe(200)
    expect(statusB).toBe(200)
  })

  test('anon (sem sessão): Camp A e Camp B -> 404 (sem legacy_anon_access, nada os protege)', async ({ browser }) => {
    const statusA = await readAdjuntosDashboard(browser, undefined, manifest.roleFixtures.camps.campA)
    const statusB = await readAdjuntosDashboard(browser, undefined, manifest.roleFixtures.camps.campB)
    expect(statusA).toBe(404)
    expect(statusB).toBe(404)
  })

  test('manipulação de camp_id na URL: sessão válida para A não abre B trocando o UUID na barra de endereço', async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(AUTH_DIR, 'adjunto_A.json') })
    const page = await context.newPage()
    await page.goto(`/campo/${manifest.roleFixtures.camps.campA}/adjuntos`)
    await expect(page.getByText('Saldo disponível')).toBeVisible()

    const response = await page.goto(`/campo/${manifest.roleFixtures.camps.campB}/adjuntos`)
    expect(response?.status()).toBe(404)
    await context.close()
  })
})
