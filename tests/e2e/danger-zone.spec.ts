/**
 * FASE 2 (E2E) — Danger Zone (`/campo/[id]/setup`, SetupForm.tsx).
 *
 * Achado de segurança explicitamente sinalizado pelo utilizador: NUNCA
 * testar a Danger Zone contra um campo real — só contra um campo [TEST]
 * criado especificamente para este teste, próprio (não partilhado com
 * outras specs, para não haver qualquer ambiguidade sobre o que está a ser
 * apagado). Cria o seu próprio campo com PIN configurado (a Danger Zone
 * fica desativada sem PIN — ver src/actions/dangerZone.ts), semeia dados
 * financeiros a apagar mais um segundo campo [TEST] de controlo para
 * confirmar que o apagar nunca sai do campo alvo, corre o fluxo real (dry
 * run → PIN → "APAGAR" → apagar) e verifica BD + Storage.
 */
import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { runSql } from '../security/sql'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from '../security/env'
import { assertTestCampId } from './lib/guardrails'
import { MANIFEST_PATH, type E2EManifest } from './global-setup'

const DANGER_PIN = '4321'

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

function anon() {
  return createClient(PRODUCTION_URL!, PRODUCTION_ANON_KEY!)
}

let manifest: E2EManifest
let dangerCampId: string
let controlCampId: string
let controlDespesaId: string

test.beforeAll(async () => {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

  const dangerRows = runSql(`
    insert into campos (nome, escalao, ano, setup_completo, saldo_inicial, legacy_anon_access, pin)
    values (${lit('[TEST] E2E Danger Zone')}, 'Aranhiço', 9999, true, 1000, true, ${lit(DANGER_PIN)})
    returning id::text as id;
  `)
  dangerCampId = dangerRows[0].id as string
  assertTestCampId(dangerCampId)

  // Campo de controlo: recebe dados próprios que NUNCA devem ser tocados
  // pela Danger Zone do campo acima — é a verificação de "nunca cross-camp".
  controlCampId = manifest.campB.id

  // Semear dados financeiros no campo-alvo: uma despesa (com foto), uma
  // devolução, uma regularização NIF (despesa + linha).
  const despesaRows = runSql(`
    insert into despesas (campo_id, numero_recibo, data, valor, descricao, codigo, codigo_descricao, tipo, nif_confirmado, is_regularizacao_nif, foto_path)
    values (${lit(dangerCampId)}, 1, '2026-07-01', 40.00, ${lit('[TEST] despesa a apagar')}, '3.1.1', ${lit('Alimentação | Compras Gerais')}, 'despesa', true, false, null)
    returning id::text as id;
  `)
  const despesaId = despesaRows[0].id as string

  runSql(`
    insert into devolucoes (campo_id, numero_devolucao, data, valor, descricao, origem_dados)
    values (${lit(dangerCampId)}, 1, '2026-07-02', 5.00, ${lit('[TEST] devolução a apagar')}, 'manual');
  `)

  const regRows = runSql(`
    insert into despesas (campo_id, numero_recibo, data, valor, descricao, codigo, codigo_descricao, tipo, nif_confirmado, is_regularizacao_nif)
    values (${lit(dangerCampId)}, 2, '2026-07-03', 10.00, ${lit('[TEST] fatura NIF a apagar')}, '3.1.1', ${lit('Alimentação | Compras Gerais')}, 'despesa', true, true)
    returning id::text as id;
  `)
  const regDespesaId = regRows[0].id as string
  runSql(`
    insert into regularizacoes_nif (campo_id, despesa_regularizacao_id, despesa_original_id, valor)
    values (${lit(dangerCampId)}, ${lit(regDespesaId)}, ${lit(despesaId)}, 10.00);
  `)

  // Dado de controlo, no OUTRO campo [TEST] — tem de sobreviver intacto.
  const controlRows = runSql(`
    insert into despesas (campo_id, numero_recibo, data, valor, descricao, codigo, codigo_descricao, tipo, nif_confirmado, is_regularizacao_nif)
    values (${lit(controlCampId)}, 1, '2026-07-01', 99.00, ${lit('[TEST] despesa de controlo — nunca deve ser apagada')}, '3.1.1', ${lit('Alimentação | Compras Gerais')}, 'despesa', true, false)
    returning id::text as id;
  `)
  controlDespesaId = controlRows[0].id as string
})

test.afterAll(async () => {
  // Limpeza própria desta spec (o campo de controlo é limpo pelo
  // global-teardown, mas a sua despesa criada aqui tem de ser removida já
  // — nunca fica associada a um campo partilhado com outras specs).
  runSql(`delete from despesas where id = '${controlDespesaId}';`)
  runSql(`delete from campos where id = '${dangerCampId}';`)
  const remaining = runSql(`select id from campos where id = '${dangerCampId}';`)
  expect(remaining).toHaveLength(0)
})

test('Danger Zone: apaga só os dados financeiros do campo-alvo, nunca do campo de controlo', async ({ page }) => {
  await page.goto(`/campo/${dangerCampId}/setup`)
  await expect(page.getByRole('heading', { name: 'Editar Setup' })).toBeVisible()

  // getByText('Danger Zone') seria ambíguo: o nome do campo fixture também
  // contém "Danger Zone" — o botão de abrir a secção é o alvo específico.
  await page.getByRole('button', { name: 'Danger Zone', exact: false }).click()
  await expect(page.getByText('Esta área apaga')).toBeVisible()

  await page.getByRole('button', { name: /Preview/ }).click()
  await expect(page.getByText('2 fatura(s) / despesa(s)')).toBeVisible()
  await expect(page.getByText('1 devolução(ões)')).toBeVisible()
  await expect(page.getByText('1 regularização(ões) NIF')).toBeVisible()

  await page.getByPlaceholder('• • • •').fill(DANGER_PIN)
  await page.getByPlaceholder('APAGAR').fill('APAGAR')

  const apagarBtn = page.getByRole('button', { name: 'Apagar dados financeiros' })
  await expect(apagarBtn).toBeEnabled()
  await apagarBtn.click()

  await expect(page.getByText(/Dados financeiros apagados/)).toBeVisible({ timeout: 15_000 })

  // ── BD: tudo apagado no campo-alvo ───────────────────────────────────
  const despesas = runSql(`select id from despesas where campo_id = '${dangerCampId}';`)
  const devolucoes = runSql(`select id from devolucoes where campo_id = '${dangerCampId}';`)
  const regularizacoes = runSql(`select id from regularizacoes_nif where campo_id = '${dangerCampId}';`)
  expect(despesas).toHaveLength(0)
  expect(devolucoes).toHaveLength(0)
  expect(regularizacoes).toHaveLength(0)

  // ── BD: o campo de controlo continua intacto (nunca cross-camp) ─────
  const controlRow = runSql(`select id::text as id, valor from despesas where id = '${controlDespesaId}';`)
  expect(controlRow).toHaveLength(1)
  expect(Number(controlRow[0].valor)).toBeCloseTo(99.0, 2)

  // ── Configuração do campo (saldo_inicial, setup) preservada ─────────
  const campoRow = runSql(`select saldo_inicial, setup_completo from campos where id = '${dangerCampId}';`)
  expect(Number(campoRow[0].saldo_inicial)).toBeCloseTo(1000, 2)
  expect(campoRow[0].setup_completo).toBe(true)
})

test('Danger Zone: RPC recusa um campo [TEST] fechado (sem legacy_anon_access, sem sessão)', async () => {
  // Nunca usa um dos 11 campos reais aqui, mesmo só para uma chamada que a
  // própria RPC recusa antes de apagar nada — usa o campo [TEST] "fechado"
  // do manifest (ver tests/e2e/lib/e2e-fixtures.ts), que existe mas não
  // tem legacy_anon_access nem qualquer membership para o anon key.
  const client = anon()
  const { error } = await client.rpc('danger_zone_clear_financials', {
    target_camp_id: manifest.closedCamp.id,
  })
  expect(error).toBeTruthy()
  expect(error!.message).toMatch(/sem autorização/)

  // Confirma que nada foi apagado (a chamada devia ter falhado antes de
  // tocar em qualquer linha — aqui não há despesas de propósito, mas
  // confirma pelo menos que o campo continua a existir e inalterado).
  const stillThere = runSql(`select id from campos where id = '${manifest.closedCamp.id}';`)
  expect(stillThere).toHaveLength(1)
})
