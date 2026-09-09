/**
 * FASE 2.1 — Baseline de segurança, SÓ LEITURA, contra o Supabase de PRODUÇÃO.
 *
 * Ao contrário de rls-matrix.test.ts (que precisa de um ambiente seguro e
 * fica SKIP até existir), esta suite corre já, de propósito, contra o projeto
 * real (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY de .env.local) — porque só faz
 * SELECT com a chave anon pública, exatamente o mesmo pedido que qualquer
 * browser já pode fazer hoje (é o achado CRITICAL da auditoria). Não é um
 * teste destrutivo: não insere, não atualiza, não apaga nada.
 *
 * Cada `it.fails(...)` afirma o comportamento DESEJADO (seguro): o `expect()`
 * lá dentro verifica "o anon foi bloqueado" (error, ou 0 linhas devolvidas).
 * Hoje, antes da subfase 2.4 (RLS migration), essa asserção FALHA de verdade
 * (o anon consegue mesmo ler) — e é exatamente por isso que usamos
 * `it.fails(...)`: transforma essa falha interna esperada num PASS "falha
 * esperada" no relatório do Vitest. Assim que a subfase 2.4 apertar a RLS, a
 * asserção lá dentro passa a ser verdadeira, o que faz `it.fails` reportar
 * FALHA (vermelho) — sinal deliberado de "isto já não falha da forma
 * esperada, tira o `.fails` e transforma num teste normal". É o mecanismo
 * pedido: "Registar claramente EXPECTED FAIL BEFORE RLS MIGRATION. Não
 * maquilhar resultados."
 */
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { PRODUCTION_URL, PRODUCTION_ANON_KEY } from './env'

const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)

/**
 * "Bloqueado" = o pedido devolveu um erro de política/permissão. Deliberadamente
 * NÃO tratamos "0 linhas devolvidas, sem erro" como bloqueado — uma tabela
 * pode estar simplesmente vazia (ex. `restricoes_alimentares` na Fase 2 pode
 * não ter linhas hoje), o que não prova nada sobre RLS. Isto mede o
 * comportamento da policy, não o conteúdo da tabela.
 */
function wasBlocked(error: unknown) {
  return Boolean(error)
}

describe.skipIf(!hasProdConfig)('EXPECTED FAIL BEFORE RLS MIGRATION — anon read baseline (produção, só leitura)', () => {
  const anon = createClient(PRODUCTION_URL!, PRODUCTION_ANON_KEY!)

  it.fails('anon NÃO deveria conseguir ler campos (inclui campos.pin hoje)', async () => {
    const { error } = await anon.from('campos').select('*').limit(1)
    expect(wasBlocked(error)).toBe(true)
  })

  it.fails('anon NÃO deveria conseguir ler despesas', async () => {
    const { error } = await anon.from('despesas').select('id').limit(1)
    expect(wasBlocked(error)).toBe(true)
  })

  it.fails('anon NÃO deveria conseguir ler despesa_linhas', async () => {
    const { error } = await anon.from('despesa_linhas').select('id').limit(1)
    expect(wasBlocked(error)).toBe(true)
  })

  it.fails('anon NÃO deveria conseguir ler devolucoes', async () => {
    const { error } = await anon.from('devolucoes').select('id').limit(1)
    expect(wasBlocked(error)).toBe(true)
  })

  it.fails('anon NÃO deveria conseguir listar o bucket faturas', async () => {
    const { error } = await anon.storage.from('faturas').list('', { limit: 1 })
    expect(wasBlocked(error)).toBe(true)
  })

  it.fails('anon NÃO deveria conseguir ler dados sensíveis das Mamãs (restricoes_alimentares)', async () => {
    const { error } = await anon.from('restricoes_alimentares').select('id').limit(1)
    expect(wasBlocked(error)).toBe(true)
  })
})

if (!hasProdConfig) {
  describe('anon read baseline', () => {
    it.skip('SKIP — NEXT_PUBLIC_SUPABASE_URL/ANON_KEY não encontrados em .env.local', () => {})
  })
}
