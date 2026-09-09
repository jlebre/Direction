/**
 * FASE 2.3 — Baseline real (não "expected fail") para `camp_memberships`,
 * criada já com RLS restritiva (migration 039). Mesmo padrão de
 * profiles-baseline.test.ts — ver lá o racional completo.
 */
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from './env'

const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)

describe.skipIf(!hasProdConfig)('camp_memberships (produção, só leitura) — RLS restritiva desde o início', () => {
  const anon = createClient(PRODUCTION_URL!, PRODUCTION_ANON_KEY!)

  it('anon não consegue ler camp_memberships', async () => {
    const { data, error } = await anon.from('camp_memberships').select('*').limit(1)
    expect(error).toBeFalsy()
    expect(data ?? []).toHaveLength(0)
  })

  it('anon não consegue inserir em camp_memberships', async () => {
    const { error } = await anon.from('camp_memberships').insert({
      camp_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      role: 'adjunto',
    })
    expect(error).toBeTruthy()
  })
})

if (!hasProdConfig) {
  describe('camp_memberships baseline', () => {
    it.skip('SKIP — NEXT_PUBLIC_SUPABASE_URL/ANON_KEY não encontrados em .env.local', () => {})
  })
}
