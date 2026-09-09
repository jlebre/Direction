/**
 * FASE 2.2 — Baseline real (não "expected fail") para a tabela `profiles`,
 * criada já com RLS restritiva desde o dia zero (migration 038), ao
 * contrário de todas as tabelas legacy cobertas em anon-read-baseline.test.ts.
 *
 * Só leitura, contra produção, com a chave anon — mesmo pedido que qualquer
 * browser já pode fazer. `profiles` está vazia nesta fase (nenhum utilizador
 * Supabase Auth criado ainda), por isso "0 linhas" por si só não prova RLS
 * (ver a mesma ressalva em anon-read-baseline.test.ts) — a confirmação real
 * de que as policies estão corretamente restritas a `authenticated` veio da
 * introspeção direta (`pg_policy`) feita ao aplicar a migration 038 (ver
 * commit da subfase 2.2). Este teste garante só que nada regride depois.
 */
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from './env'

const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)

describe.skipIf(!hasProdConfig)('profiles (produção, só leitura) — RLS restritiva desde o início', () => {
  const anon = createClient(PRODUCTION_URL!, PRODUCTION_ANON_KEY!)

  it('anon não consegue ler profiles (sem sessão, sem policy aplicável)', async () => {
    const { data, error } = await anon.from('profiles').select('*').limit(1)
    expect(error).toBeFalsy() // RLS nega silenciosamente (0 linhas), não é um erro de permissão
    expect(data ?? []).toHaveLength(0)
  })

  it('anon não consegue inserir em profiles', async () => {
    const { error } = await anon.from('profiles').insert({ id: '00000000-0000-0000-0000-000000000000' })
    expect(error).toBeTruthy() // sem policy de INSERT para authenticated nem anon -> negado
  })
})

if (!hasProdConfig) {
  describe('profiles baseline', () => {
    it.skip('SKIP — NEXT_PUBLIC_SUPABASE_URL/ANON_KEY não encontrados em .env.local', () => {})
  })
}
