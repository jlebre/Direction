/**
 * FASE 2.4 — prova direta do mecanismo de transição por campo
 * (`campos.legacy_anon_access`, migration 041/042).
 *
 * Cria dois campos de teste — um com legacy_anon_access=true, outro com
 * false (o default) — e confirma que o anon só lê/escreve o primeiro.
 * Isto testa o MECANISMO em si, distinto de rls-matrix.test.ts (que testa
 * os roles/memberships) e de anon-read-baseline.test.ts (que documenta o
 * estado dos campos REAIS, todos legacy=true por agora).
 */
import { afterAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { PRODUCTION_ANON_KEY, PRODUCTION_URL } from './env'
import { runSql } from './sql'

const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)

describe.skipIf(!hasProdConfig)('legacy_anon_access — mecanismo de transição por campo', () => {
  const runId = Math.random().toString(36).slice(2, 8)
  const anon = createClient(PRODUCTION_URL!, PRODUCTION_ANON_KEY!)
  let legacyCampId: string
  let closedCampId: string

  afterAll(() => {
    runSql(`delete from campos where id in (${[legacyCampId, closedCampId].filter(Boolean).map((id) => `'${id}'`).join(',')});`)
  })

  it('setup: cria um campo [TEST] com legacy_anon_access=true e outro com false (default)', () => {
    const legacyRows = runSql(`
      insert into campos (nome, escalao, ano, setup_completo, saldo_inicial, legacy_anon_access)
      values ('[TEST] Camp Legacy ${runId}', 'Aranhiço', 9999, true, 100, true)
      returning id::text as id;
    `)
    const closedRows = runSql(`
      insert into campos (nome, escalao, ano, setup_completo, saldo_inicial)
      values ('[TEST] Camp Closed ${runId}', 'Aranhiço', 9999, true, 100)
      returning id::text as id;
    `)
    legacyCampId = legacyRows[0].id as string
    closedCampId = closedRows[0].id as string
    expect(legacyCampId).toBeTruthy()
    expect(closedCampId).toBeTruthy()
  })

  it('anon LÊ o campo com legacy_anon_access=true', async () => {
    const { data, error } = await anon.from('campos').select('*').eq('id', legacyCampId)
    expect(error).toBeFalsy()
    expect(data?.length).toBe(1)
  })

  it('anon ESCREVE despesas no campo com legacy_anon_access=true', async () => {
    const { error } = await anon.from('despesas').insert({
      campo_id: legacyCampId,
      numero_recibo: 1,
      data: '2026-01-01',
      valor: 1,
      codigo: 'TEST',
      codigo_descricao: 'legacy ok',
      tipo: 'despesa',
    })
    expect(error).toBeFalsy()
  })

  it('anon NÃO lê o campo com legacy_anon_access=false', async () => {
    const { data, error } = await anon.from('campos').select('*').eq('id', closedCampId)
    expect(error || (data ?? []).length === 0).toBeTruthy()
  })

  it('anon NÃO escreve despesas no campo com legacy_anon_access=false', async () => {
    const { error } = await anon.from('despesas').insert({
      campo_id: closedCampId,
      numero_recibo: 1,
      data: '2026-01-01',
      valor: 1,
      codigo: 'TEST',
      codigo_descricao: 'closed deny',
      tipo: 'despesa',
    })
    expect(error).toBeTruthy()
  })
})

if (!hasProdConfig) {
  describe('legacy_anon_access', () => {
    it.skip('SKIP — sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY', () => {})
  })
}
