/**
 * FASE 2.1 — Fixtures conceptuais para a matriz de autorização.
 *
 * Estes objetos descrevem QUEM e O QUÊ a matriz de testes precisa de
 * representar (Gate A / camp_memberships, ver docs/v2/AUTHORIZATION.md e a
 * decisão fechada na mensagem de arranque da Fase 2). Só passam a criar
 * sessões/linhas reais quando houver um ambiente de teste seguro (ver env.ts)
 * — o `createFixtures()`/`teardownFixtures()` abaixo são o ponto único onde
 * isso vai acontecer, para as suites de teste nunca duplicarem essa lógica.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { TestSupabaseConfig } from './env'

export type GlobalRole = 'admin' | 'treasurer' | 'viewer'
export type CampRole = 'adjunto' | 'field_viewer'
export type MembershipStatus = 'invited' | 'active' | 'revoked'

export type FixtureRoleKey =
  | 'adjunto_A'
  | 'adjunto_B'
  | 'field_viewer_A'
  | 'treasurer'
  | 'viewer'
  | 'admin'

export interface FixtureCamp {
  key: 'campA' | 'campB'
  name: string
  /** Preenchido em runtime, depois de o camp de teste ser criado/seedado. */
  id?: string
}

export const FIXTURE_CAMPS: Record<'campA' | 'campB', FixtureCamp> = {
  campA: { key: 'campA', name: '[TEST] Camp A' },
  campB: { key: 'campB', name: '[TEST] Camp B' },
}

export interface FixtureUserSpec {
  key: FixtureRoleKey
  email: string
  globalRole: GlobalRole | null
  /** Membership local — null para roles globais que não precisam de membership (treasurer/viewer/admin). */
  membership: { camp: 'campA' | 'campB'; role: CampRole; status: MembershipStatus } | null
}

export const FIXTURE_USERS: Record<FixtureRoleKey, FixtureUserSpec> = {
  adjunto_A: {
    key: 'adjunto_A',
    email: 'test-adjunto-a@camtil.invalid',
    globalRole: null,
    membership: { camp: 'campA', role: 'adjunto', status: 'active' },
  },
  adjunto_B: {
    key: 'adjunto_B',
    email: 'test-adjunto-b@camtil.invalid',
    globalRole: null,
    membership: { camp: 'campB', role: 'adjunto', status: 'active' },
  },
  field_viewer_A: {
    key: 'field_viewer_A',
    email: 'test-field-viewer-a@camtil.invalid',
    globalRole: null,
    membership: { camp: 'campA', role: 'field_viewer', status: 'active' },
  },
  treasurer: {
    key: 'treasurer',
    email: 'test-treasurer@camtil.invalid',
    globalRole: 'treasurer',
    membership: null,
  },
  viewer: {
    key: 'viewer',
    email: 'test-viewer@camtil.invalid',
    globalRole: 'viewer',
    membership: null,
  },
  admin: {
    key: 'admin',
    email: 'test-admin@camtil.invalid',
    globalRole: 'admin',
    membership: null,
  },
}

/** Cliente Supabase com a chave anon, sem sessão — representa o ator `anon`. */
export function anonClient(cfg: TestSupabaseConfig): SupabaseClient {
  return createClient(cfg.url, cfg.anonKey)
}

/**
 * Placeholder documentado: cria os utilizadores/memberships/camps de teste
 * (via service_role, só possível num ambiente de teste seguro) e devolve um
 * cliente autenticado por fixture. Implementação real fica para quando
 * TEST_SUPABASE_URL existir (ver tests/security/env.ts) — nesta fase o
 * contrato/forma é o que importa, não a implementação, porque não há onde a
 * correr em segurança ainda.
 */
export async function createFixtures(
  _cfg: TestSupabaseConfig
): Promise<{ clients: Record<FixtureRoleKey, SupabaseClient>; camps: Record<'campA' | 'campB', string> }> {
  throw new Error(
    'createFixtures() só pode ser implementado/chamado com um ambiente de teste seguro real ' +
      '(ver tests/security/env.ts). Não implementado nesta fase — ver relatório da Fase 2.'
  )
}

export async function teardownFixtures(_cfg: TestSupabaseConfig): Promise<void> {
  throw new Error('teardownFixtures() — mesmo estado que createFixtures(), ver acima.')
}
