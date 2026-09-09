/**
 * FASE 2 (E2E) — Regularização de NIF, ponta-a-ponta.
 *
 * "Camaleões não ter despesas não é razão para deixar sem teste" — em vez
 * de depender de uma despesa real elegível existir, esta suite cria a sua
 * própria despesa elegível (nif_confirmado=false, is_regularizacao_nif=false)
 * dentro de um campo "[TEST] E2E Camp A" dedicado, corre o fluxo real de
 * regularização pela UI (`RegularizarClient.tsx` → `createRegularizacao`
 * Server Action) e verifica a relação original/regularização, os valores
 * financeiros e as linhas de BD daí resultantes.
 */
import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { runSql } from '../security/sql'
import { assertTestCampId } from './lib/guardrails'
import { MANIFEST_PATH, type E2EManifest } from './global-setup'

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

let manifest: E2EManifest
let campA: string
let despesaOriginalId: string

test.beforeAll(() => {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  campA = manifest.campA.id
  assertTestCampId(campA)

  const rows = runSql(`
    insert into despesas (campo_id, numero_recibo, data, valor, descricao, codigo, codigo_descricao, tipo, nif_confirmado, is_regularizacao_nif)
    values (${lit(campA)}, 1, '2026-07-10', 50.00, ${lit('[TEST] despesa sem NIF')}, '3.1.1', ${lit(
    'Alimentação | Compras Gerais'
  )}, 'despesa', false, false)
    returning id::text as id;
  `)
  despesaOriginalId = rows[0].id as string
})

test.afterAll(() => {
  // A despesa fixture é apagada em cascata pelo teardown do campo [TEST]
  // (global-teardown); nada a fazer aqui além de confirmar que o teste não
  // a deixou "esquecida" fora do campo de teste (nunca deveria acontecer).
  const stray = runSql(`select id from despesas where id = '${despesaOriginalId}' and campo_id != '${campA}';`)
  expect(stray).toHaveLength(0)
})

test('regulariza uma despesa sem NIF através da UI', async ({ page }) => {
  await page.goto(`/campo/${campA}/adjuntos/regularizar`)
  await expect(page.getByRole('heading', { name: 'Regularizar NIF' })).toBeVisible()

  // Passo 1 — seleccionar a fatura fixture (único item elegível no campo de teste)
  await page.getByRole('button').filter({ hasText: '#1' }).click()
  await page.getByRole('button', { name: 'Seguinte →' }).click()

  // Passo 2 — categoria obrigatória + confirmar valor pré-preenchido (total da fatura)
  await expect(page.getByRole('heading', { name: 'Nova Fatura NIF' })).toBeVisible()
  await page.getByText('Alimentação', { exact: true }).click()
  await page.getByText('Compras Gerais', { exact: true }).click()

  const criarBtn = page.getByRole('button', { name: 'Criar fatura de regularização' })
  await expect(criarBtn).toBeEnabled()
  await criarBtn.click()

  await page.waitForURL(`**/campo/${campA}/adjuntos`, { timeout: 15_000 })

  // ── Verificação de BD ────────────────────────────────────────────────
  const novaDespesaRows = runSql(`
    select id::text as id, valor, is_regularizacao_nif, nif_confirmado, codigo
    from despesas
    where campo_id = '${campA}' and is_regularizacao_nif = true;
  `)
  expect(novaDespesaRows).toHaveLength(1)
  const novaDespesa = novaDespesaRows[0]
  expect(novaDespesa.is_regularizacao_nif).toBe(true)
  expect(novaDespesa.nif_confirmado).toBe(true)
  expect(Number(novaDespesa.valor)).toBeCloseTo(50.0, 2)

  const ligacoes = runSql(`
    select despesa_original_id::text as despesa_original_id, despesa_regularizacao_id::text as despesa_regularizacao_id, valor
    from regularizacoes_nif
    where campo_id = '${campA}';
  `)
  expect(ligacoes).toHaveLength(1)
  expect(ligacoes[0].despesa_original_id).toBe(despesaOriginalId)
  expect(ligacoes[0].despesa_regularizacao_id).toBe(novaDespesa.id)
  expect(Number(ligacoes[0].valor)).toBeCloseTo(50.0, 2)

  // A despesa original passa a "regularizada" no ecrã de seleção — já não deve aparecer como pendente.
  await page.goto(`/campo/${campA}/adjuntos/regularizar`)
  await expect(page.getByText('Tudo regularizado!')).toBeVisible()
})
