/**
 * FASE 2.1 — Matriz de autorização (RLS + sessão), pedida na abertura da Fase 2.
 *
 *   anon -> camps                   DENY dados privados
 *   anon -> expenses                DENY
 *   anon -> expense_lines           DENY
 *   anon -> refunds                 DENY
 *   anon -> invoice storage         DENY
 *
 *   adjunto_A -> Camp A             ALLOW
 *   adjunto_A -> Camp B             DENY
 *
 *   field_viewer_A -> Camp A read   ALLOW
 *   field_viewer_A -> Camp A write  DENY
 *
 *   treasurer -> Camp A/B           ALLOW (financeiro)
 *
 *   viewer -> Camp A/B read         ALLOW
 *   viewer -> Camp A/B write        DENY
 *
 *   admin -> administração          ALLOW
 *
 * ESTADO ATUAL: toda esta suite fica SKIP — ver tests/security/env.ts. Exige
 * sessões reais (Supabase Auth) e escrita de fixtures (camp_memberships), e
 * este projeto não tem, nesta fase, nenhuma forma segura de o fazer (sem
 * Docker/Supabase local, sem projeto de Development dedicado). Corre
 * automaticamente assim que TEST_SUPABASE_URL/TEST_SUPABASE_ANON_KEY
 * apontarem para um ambiente que NÃO seja produção (ver env.ts — a função
 * recusa-se a aceitar o mesmo hostname de produção).
 *
 * A estrutura e as asserções abaixo são o contrato de aceitação da subfase
 * 2.4 (RLS migration) — quando esta suite tiver um ambiente para correr, ela
 * É o critério de "RLS está correta", não só documentação.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createFixtures, FIXTURE_CAMPS, teardownFixtures, type FixtureRoleKey } from './fixtures'
import { getTestSupabaseConfig, hasSafeTestEnv, SKIP_REASON } from './env'
import type { SupabaseClient } from '@supabase/supabase-js'

describe.skipIf(!hasSafeTestEnv)('RLS authorization matrix (requires safe test env)', () => {
  const cfg = getTestSupabaseConfig()!
  let clients: Record<FixtureRoleKey, SupabaseClient>
  let campIds: Record<'campA' | 'campB', string>
  let anon: SupabaseClient

  beforeAll(async () => {
    anon = anonClient(cfg)
    const fixtures = await createFixtures(cfg)
    clients = fixtures.clients
    campIds = fixtures.camps
  })

  afterAll(async () => {
    await teardownFixtures(cfg)
  })

  describe('anon (sem sessão)', () => {
    it('não lê campos privados (camps)', async () => {
      const { data, error } = await anon.from('camps').select('*')
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
    it('não lê despesas (expenses)', async () => {
      const { data, error } = await anon.from('expenses').select('*')
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
    it('não lê linhas de despesa (expense_lines)', async () => {
      const { data, error } = await anon.from('expense_lines').select('*')
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
    it('não lê devoluções (refunds)', async () => {
      const { data, error } = await anon.from('refunds').select('*')
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
    it('não lista/descarrega faturas no Storage', async () => {
      const { data, error } = await anon.storage.from('faturas').list(campIds.campA)
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
    it('não escreve em nenhuma tabela financeira', async () => {
      const { error } = await anon
        .from('expenses')
        .insert({ camp_id: campIds.campA, amount: 1, code: 'TEST' })
      expect(error).toBeTruthy()
    })
  })

  describe('adjunto_A', () => {
    it('acede ao Camp A (o seu)', async () => {
      const { data, error } = await clients.adjunto_A.from('camps').select('*').eq('id', campIds.campA)
      expect(error).toBeFalsy()
      expect(data?.length).toBeGreaterThan(0)
    })
    it('NÃO acede ao Camp B (não é seu)', async () => {
      const { data, error } = await clients.adjunto_A.from('camps').select('*').eq('id', campIds.campB)
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
    it('NÃO consegue inserir despesa no Camp B mesmo enviando o camp_id certo no payload', async () => {
      const { error } = await clients.adjunto_A
        .from('expenses')
        .insert({ camp_id: campIds.campB, amount: 10, code: 'TEST' })
      expect(error).toBeTruthy()
    })
  })

  describe('field_viewer_A', () => {
    it('lê o Camp A (read-only)', async () => {
      const { data, error } = await clients.field_viewer_A.from('camps').select('*').eq('id', campIds.campA)
      expect(error).toBeFalsy()
      expect(data?.length).toBeGreaterThan(0)
    })
    it('NÃO escreve no Camp A', async () => {
      const { error } = await clients.field_viewer_A
        .from('expenses')
        .insert({ camp_id: campIds.campA, amount: 10, code: 'TEST' })
      expect(error).toBeTruthy()
    })
  })

  describe('treasurer', () => {
    it('lê financeiro do Camp A e do Camp B sem membership em nenhum', async () => {
      const a = await clients.treasurer.from('expenses').select('*').eq('camp_id', campIds.campA)
      const b = await clients.treasurer.from('expenses').select('*').eq('camp_id', campIds.campB)
      expect(a.error).toBeFalsy()
      expect(b.error).toBeFalsy()
    })
  })

  describe('viewer (Direção)', () => {
    it('lê Camp A e Camp B', async () => {
      const a = await clients.viewer.from('camps').select('*').eq('id', campIds.campA)
      const b = await clients.viewer.from('camps').select('*').eq('id', campIds.campB)
      expect(a.data?.length).toBeGreaterThan(0)
      expect(b.data?.length).toBeGreaterThan(0)
    })
    it('NÃO escreve em despesas', async () => {
      const { error } = await clients.viewer
        .from('expenses')
        .insert({ camp_id: campIds.campA, amount: 10, code: 'TEST' })
      expect(error).toBeTruthy()
    })
  })

  describe('admin', () => {
    it('administra memberships', async () => {
      const { error } = await clients.admin
        .from('camp_memberships')
        .update({ status: 'revoked' })
        .eq('camp_id', campIds.campB)
        .eq('role', 'adjunto')
      expect(error).toBeFalsy()
    })
  })
})

if (!hasSafeTestEnv) {
  describe('RLS authorization matrix', () => {
    it.skip(`SKIP — ${SKIP_REASON}`, () => {})
  })
}
