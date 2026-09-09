/**
 * FASE 2 (E2E) — Devoluções, ponta-a-ponta contra a app deployada.
 *
 * Cobre exactamente o que o utilizador pediu para deixar de ser testado à
 * mão: criar sem imagem, criar com imagem, editar, anexar/trocar/remover
 * imagem, eliminar — verificando UI, Server Action (`src/actions/
 * devolucoes.ts`), BD e Storage a cada passo. Usa os campos fixture
 * "[TEST] E2E Camp A/B" (ver `tests/e2e/lib/e2e-fixtures.ts`) — nunca os 11
 * campos reais.
 *
 * Corre em série (`describe.serial`) porque os testes de edição/anexo/
 * remoção de imagem e o de eliminação dependem da devolução criada nos
 * testes anteriores.
 */
import path from 'node:path'
import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { runSql } from '../security/sql'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from '../security/env'
import { createClient } from '@supabase/supabase-js'
import { assertTestCampId } from './lib/guardrails'
import { MANIFEST_PATH, type E2EManifest } from './global-setup'

const SAMPLE_IMAGE = path.join(__dirname, 'fixtures', 'sample-invoice.png')

// Réplica de `getCampoSlug()` — ver o comentário equivalente em global-teardown.ts.
function slugOf(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function anon() {
  return createClient(PRODUCTION_URL!, PRODUCTION_ANON_KEY!)
}

async function dbDevolucao(id: string) {
  const rows = runSql(`select * from devolucoes where id = '${id}';`)
  return rows[0] ?? null
}

async function storageHasFile(path_: string): Promise<boolean> {
  const [folder, filename] = [path_.split('/').slice(0, -1).join('/'), path_.split('/').pop()!]
  const { data } = await anon().storage.from('faturas').list(folder)
  return Boolean(data?.some((f) => f.name === filename))
}

let manifest: E2EManifest
let campA: string
let campASlug: string

test.beforeAll(() => {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  campA = manifest.campA.id
  campASlug = slugOf(manifest.campA.nome)
  // Guardrail redundante ao nível do próprio spec — nunca confiar só no
  // global-setup para operações que vão editar/apagar dados.
  assertTestCampId(campA)
})

test.describe.serial('Devoluções — CRUD ponta-a-ponta', () => {
  let devolucaoSemFotoId: string
  let devolucaoComFotoId: string
  let devolucaoComFotoPathInicial: string

  test('cria devolução sem imagem', async ({ page }) => {
    await page.goto(`/campo/${campA}/adjuntos/nova-devolucao`)
    await expect(page.getByRole('heading', { name: 'Nova Devolução' })).toBeVisible()

    await page.locator('input[type=date]').fill('2026-07-15')
    await page.getByPlaceholder('0,00').fill('12,50')
    await page.getByPlaceholder('Ex: Devolução Continente, Nota de crédito...').fill('[TEST] devolução sem imagem')

    await page.getByRole('button', { name: 'Registar Devolução' }).click()
    await page.waitForURL(`**/campo/${campA}/adjuntos`)

    const rows = runSql(
      `select id::text as id, valor, descricao, foto_path from devolucoes where campo_id = '${campA}' and descricao = '[TEST] devolução sem imagem';`
    )
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].valor)).toBeCloseTo(12.5, 2)
    expect(rows[0].foto_path).toBeNull()
    devolucaoSemFotoId = rows[0].id as string
  })

  test('cria devolução com imagem', async ({ page }) => {
    await page.goto(`/campo/${campA}/adjuntos/nova-devolucao`)
    await page.locator('input[type=date]').fill('2026-07-16')
    await page.getByPlaceholder('0,00').fill('30,00')
    await page.getByPlaceholder('Ex: Devolução Continente, Nota de crédito...').fill('[TEST] devolução com imagem')

    // Categoria (opcional em devoluções, mas exercita o CodeSelector também aqui)
    await page.getByText('Alimentação', { exact: true }).click()
    await page.getByText('Compras Gerais', { exact: true }).click()

    // Input de galeria (segundo <input type=file>, sem `capture`)
    await page.locator('input[type=file]').nth(1).setInputFiles(SAMPLE_IMAGE)
    await expect(page.locator('img[alt="Documento"]')).toBeVisible()

    await page.getByRole('button', { name: 'Registar Devolução' }).click()
    await page.waitForURL(`**/campo/${campA}/adjuntos`)

    const rows = runSql(
      `select id::text as id, foto_path, codigo from devolucoes where campo_id = '${campA}' and descricao = '[TEST] devolução com imagem';`
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].codigo).toBe('3.1.1')
    expect(rows[0].foto_path).toBeTruthy()
    devolucaoComFotoId = rows[0].id as string
    devolucaoComFotoPathInicial = rows[0].foto_path as string

    expect(devolucaoComFotoPathInicial.startsWith(campASlug)).toBe(true)
    expect(await storageHasFile(devolucaoComFotoPathInicial)).toBe(true)
  })

  test('edita devolução (sem imagem) — dados', async ({ page }) => {
    await page.goto(`/campo/${campA}/adjuntos/devolucao/${devolucaoSemFotoId}/editar`)
    await expect(page.getByRole('heading', { name: 'Editar Devolução' })).toBeVisible()

    const valorInput = page.getByPlaceholder('0,00')
    await valorInput.fill('')
    await valorInput.fill('20,00')
    await page.getByPlaceholder('Observações adicionais...').fill('[TEST] editado por Playwright')

    await page.getByRole('button', { name: 'Guardar Alterações' }).click()
    await page.waitForURL(`**/campo/${campA}/adjuntos/devolucao/${devolucaoSemFotoId}`)

    const row = await dbDevolucao(devolucaoSemFotoId)
    expect(Number(row.valor)).toBeCloseTo(20.0, 2)
    expect(row.notas).toBe('[TEST] editado por Playwright')
  })

  test('anexa imagem a uma devolução que não tinha', async ({ page }) => {
    await page.goto(`/campo/${campA}/adjuntos/devolucao/${devolucaoSemFotoId}/editar`)
    await page.locator('input[type=file]').nth(1).setInputFiles(SAMPLE_IMAGE)
    await expect(page.locator('img[alt="Documento"]')).toBeVisible()

    await page.getByRole('button', { name: 'Guardar Alterações' }).click()
    await page.waitForURL(`**/campo/${campA}/adjuntos/devolucao/${devolucaoSemFotoId}`)

    const row = await dbDevolucao(devolucaoSemFotoId)
    expect(row.foto_path).toBeTruthy()
    expect(await storageHasFile(row.foto_path as string)).toBe(true)
  })

  test('troca a imagem existente por outra', async ({ page }) => {
    await page.goto(`/campo/${campA}/adjuntos/devolucao/${devolucaoComFotoId}/editar`)
    await expect(page.locator('img[alt="Documento"]')).toBeVisible()

    // "Câmara"/"Galeria"/"Remover" — troca é o botão do meio (Galeria) quando já há foto
    await page.getByRole('button', { name: '🖼 Galeria' }).click()
    await page.locator('input[type=file]').nth(1).setInputFiles(SAMPLE_IMAGE)

    await page.getByRole('button', { name: 'Guardar Alterações' }).click()
    await page.waitForURL(`**/campo/${campA}/adjuntos/devolucao/${devolucaoComFotoId}`)

    const row = await dbDevolucao(devolucaoComFotoId)
    expect(row.foto_path).toBeTruthy()
    expect(await storageHasFile(row.foto_path as string)).toBe(true)
    // Mesmo nome de ficheiro (path determinístico por número de devolução) — troca faz upsert.
    expect(row.foto_path).toBe(devolucaoComFotoPathInicial)
  })

  test('remove a imagem de uma devolução', async ({ page }) => {
    await page.goto(`/campo/${campA}/adjuntos/devolucao/${devolucaoComFotoId}/editar`)
    await expect(page.locator('img[alt="Documento"]')).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.locator('img[alt="Documento"]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Guardar Alterações' }).click()
    await page.waitForURL(`**/campo/${campA}/adjuntos/devolucao/${devolucaoComFotoId}`)

    const row = await dbDevolucao(devolucaoComFotoId)
    expect(row.foto_path).toBeNull()
    expect(await storageHasFile(devolucaoComFotoPathInicial)).toBe(false)
  })

  test('cross-camp: devolução do Camp A não é visível pela URL do Camp B', async ({ page }) => {
    const response = await page.goto(`/campo/${manifest.campB.id}/adjuntos/devolucao/${devolucaoSemFotoId}`)
    expect(response?.status()).toBe(404)
  })

  test('elimina as duas devoluções de teste', async ({ page }) => {
    for (const id of [devolucaoSemFotoId, devolucaoComFotoId]) {
      await page.goto(`/campo/${campA}/adjuntos/devolucao/${id}`)
      await page.getByRole('button', { name: 'Eliminar Devolução' }).click()
      await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
      await page.waitForURL(`**/campo/${campA}/adjuntos`)

      expect(await dbDevolucao(id)).toBeNull()
    }
  })

  test('campo fechado (sem legacy_anon_access): a página de nova devolução não carrega', async ({ page }) => {
    const response = await page.goto(`/campo/${manifest.closedCamp.id}/adjuntos/nova-devolucao`)
    expect(response?.status()).toBe(404)
  })
})
