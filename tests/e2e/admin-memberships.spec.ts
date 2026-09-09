/**
 * FASE 2 (fecho) — `/admin/memberships` é a ÚNICA rota hoje que é
 * simultaneamente (a) real UI construída e (b) consciente de sessão
 * (`createSessionServerClient()`, ver page.tsx) — por isso é a única onde
 * faz sentido testar "admin" ao nível de UI com uma sessão real injectada
 * (`tests/e2e/lib/session-cookies.ts` + fixtures de
 * `tests/security/fixtures.ts`, geradas em global-setup.ts).
 *
 * Duas camadas de autorização coexistem deliberadamente (ver
 * `src/app/admin/layout.tsx`):
 *   1. Gate legacy por PIN (cookie `admin_auth`) — protege TODO o /admin/*.
 *   2. Dentro disso, `/admin/memberships` exige ADICIONALMENTE uma sessão
 *      Supabase Auth real com `global_role='admin'`.
 * As fixtures de role (global-setup.ts) incluem sempre o cookie
 * `admin_auth` — sem ele, nenhuma delas passaria da camada 1 para se poder
 * testar a camada 2, que é o que interessa aqui.
 *
 * `/tesouraria/*` está protegido por `proxy.ts` mas não tem nenhuma página
 * construída ainda (só o matcher existe) — nada para testar por UI aí além
 * do redirect para /login, que também se confirma aqui.
 */
import path from 'node:path'
import { test, expect } from '@playwright/test'

const AUTH_DIR = path.join(__dirname, '.auth')

test.describe('/admin/memberships — autorização por sessão real (camada 2, depois do PIN legacy)', () => {
  test('admin vê o conteúdo real (memberships + estado de migração)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(AUTH_DIR, 'admin.json') })
    const page = await context.newPage()
    await page.goto('/admin/memberships')
    await expect(page.getByText('Estado de migração por campo')).toBeVisible()
    await expect(page.getByText('Memberships existentes')).toBeVisible()
    await context.close()
  })

  test('viewer (sessão real, mas global_role != admin) é recusado com o motivo certo', async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(AUTH_DIR, 'viewer.json') })
    const page = await context.newPage()
    await page.goto('/admin/memberships')
    await expect(page.getByText(/não tem global_role='admin'/)).toBeVisible()
    await expect(page.getByText('Estado de migração por campo')).toHaveCount(0)
    await context.close()
  })

  test('treasurer (sessão real, global_role=treasurer) também é recusado — só admin administra', async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(AUTH_DIR, 'treasurer.json') })
    const page = await context.newPage()
    await page.goto('/admin/memberships')
    await expect(page.getByText(/não tem global_role='admin'/)).toBeVisible()
    await context.close()
  })

  test('field_viewer_A (role local, sem global_role) é recusado', async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(AUTH_DIR, 'field_viewer_A.json') })
    const page = await context.newPage()
    await page.goto('/admin/memberships')
    await expect(page.getByText(/não tem global_role='admin'/)).toBeVisible()
    await context.close()
  })
})

test.describe('/admin/* — gate legacy por PIN (camada 1, cookie admin_auth)', () => {
  test('sem o cookie admin_auth: fica preso no ecrã de PIN, nunca vê /admin/memberships', async ({ page }) => {
    await page.goto('/admin/memberships')
    await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible()
    await expect(page.getByText('Introduz o PIN de administrador')).toBeVisible()
    await expect(page.getByText('Estado de migração por campo')).toHaveCount(0)
  })
})

test.describe('/tesouraria — proxy.ts', () => {
  test('redireciona para /login sem sessão (nenhuma página construída ainda, só o matcher)', async ({ page }) => {
    const response = await page.goto('/tesouraria')
    expect(page.url()).toContain('/login')
    expect(decodeURIComponent(page.url())).toContain('next=/tesouraria')
    void response
  })
})
