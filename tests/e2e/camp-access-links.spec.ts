/**
 * FASE 2 — Camp Access Links: fluxo real de bootstrap por browser (secção
 * 22 do pedido). Complementa `tests/security/camp-access-links.test.ts`
 * (nível RPC/BD) com o que só um browser real prova: cookie definido,
 * redirect, o token desaparecer da URL, negação cross-camp por navegação
 * directa, e o ciclo de escrita de uma despesa pela UI.
 *
 * Cria as suas próprias fixtures dedicadas (campo + utilizador admin, via
 * o mesmo mecanismo de tests/security/fixtures.ts) — nunca reutiliza os
 * campos [TEST] E2E Camp A/B de outras specs, para o link gerado aqui não
 * poder ser confundido com sessões de outro teste.
 */
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { test, expect } from '@playwright/test'

const SAMPLE_IMAGE = path.join(__dirname, 'fixtures', 'sample-invoice.png')
import { createFixtures, teardownFixtures, type CreatedFixtures } from '../security/fixtures'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from '../security/env'
import { assertAuthorizedProject } from './lib/guardrails'

function freshToken() {
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

let fixtures: CreatedFixtures

test.beforeAll(async () => {
  assertAuthorizedProject()
  fixtures = await createFixtures({ url: PRODUCTION_URL!, anonKey: PRODUCTION_ANON_KEY!, serviceRoleKey: undefined })
})

test.afterAll(async () => {
  await teardownFixtures(fixtures)
})

async function createLinkFor(campId: string) {
  const { token, hash } = freshToken()
  const { data: linkId, error } = await fixtures.clients.admin.rpc('camp_access_create_link', {
    p_camp_id: campId,
    p_token_hash: hash,
    p_expires_at: null,
  })
  if (error) throw new Error(`createLinkFor falhou: ${error.message}`)
  return { token, linkId: linkId as string }
}

test.describe('Camp Access Links — bootstrap real', () => {
  test('abrir /a/<token> entra directamente no campo, sem o token na URL final', async ({ page }) => {
    const { token } = await createLinkFor(fixtures.camps.campA)
    await page.goto(`/a/${token}`)
    await expect(page).toHaveURL(new RegExp(`/campo/${fixtures.camps.campA}/adjuntos$`))
    await expect(page.getByText('Saldo disponível')).toBeVisible()
    expect(page.url()).not.toContain(token)
  })

  test('token inválido -> página genérica de acesso inválido', async ({ page }) => {
    await page.goto('/a/isto-nunca-foi-um-token-valido')
    await expect(page).toHaveURL(/\/a\/invalido$/)
    await expect(page.getByText('Link inválido')).toBeVisible()
  })

  test('token expirado -> acesso inválido', async ({ page }) => {
    const { token, hash } = freshToken()
    const past = new Date(Date.now() - 60_000).toISOString()
    await fixtures.clients.admin.rpc('camp_access_create_link', {
      p_camp_id: fixtures.camps.campB,
      p_token_hash: hash,
      p_expires_at: past,
    })
    await page.goto(`/a/${token}`)
    await expect(page).toHaveURL(/\/a\/invalido$/)
  })

  test('token revogado -> acesso inválido', async ({ page }) => {
    const { token, linkId } = await createLinkFor(fixtures.camps.campB)
    await fixtures.clients.admin.rpc('camp_access_revoke_link', { p_link_id: linkId })
    await page.goto(`/a/${token}`)
    await expect(page).toHaveURL(/\/a\/invalido$/)
  })

  test('sessão de capacidade: próprio campo ALLOW, outro campo DENY por navegação directa (URL)', async ({ page }) => {
    const { token } = await createLinkFor(fixtures.camps.campA)
    await page.goto(`/a/${token}`)
    await expect(page.getByText('Saldo disponível')).toBeVisible()

    // Mesma sessão (mesmo cookie), navega directamente para o OUTRO campo.
    const response = await page.goto(`/campo/${fixtures.camps.campB}/adjuntos`)
    expect(response?.status()).toBe(404)

    // E o próprio continua acessível com a mesma sessão.
    await page.goto(`/campo/${fixtures.camps.campA}/adjuntos`)
    await expect(page.getByText('Saldo disponível')).toBeVisible()
  })

  test('regenerar: sessão criada a partir do link antigo deixa de funcionar', async ({ page }) => {
    const { token: oldToken } = await createLinkFor(fixtures.camps.campA)
    await page.goto(`/a/${oldToken}`)
    await expect(page.getByText('Saldo disponível')).toBeVisible()

    // Regenerar = criar um novo link para o mesmo campo (revoga o anterior).
    await createLinkFor(fixtures.camps.campA)

    // A sessão (cookie) já definida a partir do link antigo deixa de resolver.
    const response = await page.goto(`/campo/${fixtures.camps.campA}/adjuntos`)
    expect(response?.status()).toBe(404)
  })

  test('ciclo completo de uma despesa pela UI, usando só o link (sem PIN, sem login)', async ({ page }) => {
    const { token } = await createLinkFor(fixtures.camps.campA)
    await page.goto(`/a/${token}`)

    await page.goto(`/campo/${fixtures.camps.campA}/adjuntos/nova-despesa`)
    await expect(page.getByRole('heading', { name: 'Nova Despesa' })).toBeVisible()

    // Passo 1 — foto (obrigatória para avançar nesta wizard). Galeria = 2º input[type=file].
    await page.locator('input[type=file]').nth(1).setInputFiles(SAMPLE_IMAGE)
    await page.getByRole('button', { name: /Seguinte →|Ignorar OCR e continuar →/ }).click()

    // Passo 2 — valor/descrição/data.
    await page.getByPlaceholder('0,00').fill('9,90')
    await page.getByPlaceholder('Ex: Compras Lidl para jantar de sábado').fill('[TEST] via camp access link')
    await page.getByRole('button', { name: 'Seguinte →' }).click()

    // Passo 3 — categoria.
    await page.getByText('Alimentação', { exact: true }).click()
    await page.getByText('Compras Gerais', { exact: true }).click()
    await page.getByRole('button', { name: 'Seguinte →' }).click()

    // Passo 4 — confirmação.
    await page.getByRole('button', { name: 'Registar Despesa' }).click()
    await page.waitForURL(new RegExp(`/campo/${fixtures.camps.campA}/adjuntos$`), { timeout: 15_000 })
    await expect(page.getByText('[TEST] via camp access link')).toBeVisible()
  })
})
