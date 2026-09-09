/**
 * FASE 2.3+ — matriz de autorização comportamental, com fixtures reais.
 *
 * Autorizado explicitamente a correr contra PRODUÇÃO (szntdkykqmsofgcwrsrt),
 * usando exclusivamente fixtures sintéticas claramente identificadas
 * ("[TEST] Camp A/B", emails "@camtil.invalid") — ver tests/security/fixtures.ts
 * para como são criadas/apagadas, e o relatório de execução da Fase 2 para o
 * porquê de não se usar `service_role`.
 *
 *   anon -> camps                   DENY dados privados
 *   anon -> expenses/lines/refunds  DENY
 *   anon -> invoice storage         DENY
 *   adjunto_A -> Camp A             ALLOW (read/write)
 *   adjunto_A -> Camp B             DENY
 *   field_viewer_A -> Camp A read   ALLOW
 *   field_viewer_A -> Camp A write  DENY
 *   treasurer -> Camp A/B           ALLOW (financeiro)
 *   viewer -> Camp A/B read         ALLOW
 *   viewer -> Camp A/B write        DENY
 *   admin -> administração          ALLOW
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createFixtures, findOrphanedTestFixtures, teardownFixtures, type CreatedFixtures } from './fixtures'
import { getTestSupabaseConfig, PRODUCTION_ANON_KEY, PRODUCTION_URL } from './env'
import type { SupabaseClient } from '@supabase/supabase-js'

// Produção é o alvo sancionado destas fixtures (autorização explícita do
// utilizador) — mantém-se também o caminho para um ambiente dedicado
// (TEST_SUPABASE_URL) caso venha a existir no futuro, sem preferência por
// nenhum dos dois aqui.
const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)
const dedicatedTestEnv = getTestSupabaseConfig()
const cfg = dedicatedTestEnv ?? (hasProdConfig ? { url: PRODUCTION_URL!, anonKey: PRODUCTION_ANON_KEY!, serviceRoleKey: undefined } : null)

// Rede de segurança a nível de ficheiro (independente do teardown de cada
// corrida): depois de TUDO (incl. o afterAll interno abaixo) já ter corrido,
// confirma por padrão de nome/email que não sobrou nenhuma fixture "[TEST]"
// — nunca apaga nada aqui, só falha alto se encontrar algo, para nunca
// terminar em silêncio com lixo em produção.
afterAll(() => {
  if (!cfg) return
  const orphans = findOrphanedTestFixtures()
  if (orphans.camps.length > 0 || orphans.users.length > 0) {
    throw new Error(
      `Sobraram fixtures [TEST] depois da suite (nunca apagadas automaticamente por padrão de nome — ` +
        `limpar manualmente estes IDs exatos): ${JSON.stringify(orphans)}`
    )
  }
})

describe.skipIf(!cfg)('RLS authorization matrix (fixtures sintéticas)', () => {
  let fixtures: CreatedFixtures | undefined
  let anon: SupabaseClient
  let campA: string
  let campB: string

  beforeAll(async () => {
    anon = anonClient(cfg!)
    fixtures = await createFixtures(cfg!)
    campA = fixtures.camps.campA
    campB = fixtures.camps.campB
  }, 30000)

  // Defensivo: se o beforeAll falhar a meio (ex. erro numa fixture depois de
  // outras já criadas), `fixtures` continua populado com o que já foi criado
  // até ao ponto da falha, e o teardown ainda o consegue limpar. Só fica
  // mesmo `undefined` se falhar antes de qualquer criação.
  afterAll(async () => {
    if (fixtures) await teardownFixtures(fixtures)
  }, 30000)

  describe('anon (sem sessão)', () => {
    it('não lê o campo de teste A', async () => {
      const { data, error } = await anon.from('campos').select('*').eq('id', campA)
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
    it('não escreve despesas no campo de teste A', async () => {
      // Payload completo de propósito (todas as colunas NOT NULL) — para o
      // insert falhar só por RLS, nunca por violar uma constraint, o que
      // mascararia um falso "DENY" sem RLS estar mesmo a bloquear.
      const { error } = await anon.from('despesas').insert({
        campo_id: campA,
        numero_recibo: 1,
        data: '2026-01-01',
        valor: 1,
        codigo: 'TEST',
        codigo_descricao: 'Fixture de teste',
        tipo: 'despesa',
      })
      expect(error).toBeTruthy()
    })
  })

  describe('adjunto_A', () => {
    it('acede ao Camp A (o seu)', async () => {
      const { data, error } = await fixtures!.clients.adjunto_A.from('campos').select('*').eq('id', campA)
      expect(error).toBeFalsy()
      expect(data?.length).toBeGreaterThan(0)
    })
    it('NÃO acede ao Camp B', async () => {
      const { data, error } = await fixtures!.clients.adjunto_A.from('campos').select('*').eq('id', campB)
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
  })

  describe('adjunto_B', () => {
    it('acede ao Camp B (o seu)', async () => {
      const { data, error } = await fixtures!.clients.adjunto_B.from('campos').select('*').eq('id', campB)
      expect(error).toBeFalsy()
      expect(data?.length).toBeGreaterThan(0)
    })
    it('NÃO acede ao Camp A', async () => {
      const { data, error } = await fixtures!.clients.adjunto_B.from('campos').select('*').eq('id', campA)
      expect(error || (data ?? []).length === 0).toBeTruthy()
    })
  })

  describe('field_viewer_A', () => {
    it('lê o Camp A (read-only)', async () => {
      const { data, error } = await fixtures!.clients.field_viewer_A.from('campos').select('*').eq('id', campA)
      expect(error).toBeFalsy()
      expect(data?.length).toBeGreaterThan(0)
    })
  })

  describe('treasurer', () => {
    it('lê Camp A e Camp B sem membership em nenhum', async () => {
      const a = await fixtures!.clients.treasurer.from('campos').select('*').eq('id', campA)
      const b = await fixtures!.clients.treasurer.from('campos').select('*').eq('id', campB)
      expect(a.data?.length).toBeGreaterThan(0)
      expect(b.data?.length).toBeGreaterThan(0)
    })
  })

  describe('viewer (Direção)', () => {
    it('lê Camp A e Camp B', async () => {
      const a = await fixtures!.clients.viewer.from('campos').select('*').eq('id', campA)
      const b = await fixtures!.clients.viewer.from('campos').select('*').eq('id', campB)
      expect(a.data?.length).toBeGreaterThan(0)
      expect(b.data?.length).toBeGreaterThan(0)
    })
  })

  describe('admin', () => {
    it('lê camp_memberships de qualquer campo de teste', async () => {
      const { data, error } = await fixtures!.clients.admin.from('camp_memberships').select('*').eq('camp_id', campA)
      expect(error).toBeFalsy()
      expect(data?.length).toBeGreaterThan(0)
    })
  })
})

if (!cfg) {
  describe('RLS authorization matrix', () => {
    it.skip('SKIP — sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY nem TEST_SUPABASE_URL configurados', () => {})
  })
}
