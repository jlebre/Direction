/**
 * FASE 2 (fecho) — matriz comportamental completa por role, pedida
 * explicitamente antes de considerar a Fase 2 concluída.
 *
 * Complementa `rls-matrix.test.ts` (que só cobre leitura de `campos`) com
 * read/create/update/delete em `despesas`, por role × campo (próprio vs.
 * outro), usando as mesmas fixtures sintéticas ([TEST] Camp A/B,
 * `adjunto_A/B`, `field_viewer_A`, `treasurer`, `viewer`, `admin`, `anon`).
 *
 * Verificação sempre por RE-LEITURA com o cliente `admin` (nunca só pelo
 * `error` devolvido) — um UPDATE/DELETE bloqueado por RLS via PostgREST
 * devolve sucesso com 0 linhas afetadas, não um erro; confiar só em
 * `error` produziria falsos "ALLOW" (já corrigido uma vez nesta suite,
 * ver migration 042 no histórico).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createFixtures, findOrphanedTestFixtures, teardownFixtures, type CreatedFixtures, type FixtureRoleKey } from './fixtures'
import { getTestSupabaseConfig, PRODUCTION_ANON_KEY, PRODUCTION_URL } from './env'
import type { SupabaseClient } from '@supabase/supabase-js'

const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)
const dedicatedTestEnv = getTestSupabaseConfig()
const cfg = dedicatedTestEnv ?? (hasProdConfig ? { url: PRODUCTION_URL!, anonKey: PRODUCTION_ANON_KEY!, serviceRoleKey: undefined } : null)

afterAll(() => {
  if (!cfg) return
  const orphans = findOrphanedTestFixtures()
  if (orphans.camps.length > 0 || orphans.users.length > 0) {
    throw new Error(
      `Sobraram fixtures [TEST] depois da suite (limpar manualmente estes IDs exatos): ${JSON.stringify(orphans)}`
    )
  }
})

interface Cap {
  read: boolean
  write: boolean // create + update (sempre juntos na RLS actual, ver despesas_insert/despesas_update)
  del: boolean // DELETE tem uma policy própria e MAIS restrita — ver nota abaixo
}

// role -> { own: capacidade no seu próprio campo, other: no campo do outro }.
// "own"/"other" só importa para adjunto_A/B e field_viewer_A — treasurer/
// viewer/admin têm a mesma capacidade nos dois, porque não dependem de
// camp_membership (ver has_camp_access()/can_edit_camp(), migration 039).
//
// Achado real desta suite (migration 042, decisão já existente — não uma
// regressão introduzida agora): `despesas_delete` usa
// `is_admin() OR is_treasurer() OR has_legacy_anon_access(campo_id)`, DE
// PROPÓSITO sem `can_edit_camp()` — um `adjunto` com `camp_membership` real
// pode ler/criar/editar no seu campo mas NÃO apagar; só admin/treasurer (ou
// a exceção legacy, que é como os adjuntos reais apagam hoje) podem. Por
// isso `del: false` para adjunto_A/B "own" abaixo, mesmo com `write: true`.
const MATRIX: Record<FixtureRoleKey, { own: Cap; other: Cap }> = {
  adjunto_A: { own: { read: true, write: true, del: false }, other: { read: false, write: false, del: false } },
  adjunto_B: { own: { read: true, write: true, del: false }, other: { read: false, write: false, del: false } },
  field_viewer_A: { own: { read: true, write: false, del: false }, other: { read: false, write: false, del: false } },
  treasurer: { own: { read: true, write: true, del: true }, other: { read: true, write: true, del: true } },
  viewer: { own: { read: true, write: false, del: false }, other: { read: true, write: false, del: false } },
  admin: { own: { read: true, write: true, del: true }, other: { read: true, write: true, del: true } },
}

// Qual campo é "own" para cada role (o outro é "other"). adjunto_B, sendo
// dono de Camp B, tem "own"=campB — invertido face aos restantes.
const OWN_CAMP: Record<FixtureRoleKey, 'campA' | 'campB'> = {
  adjunto_A: 'campA',
  adjunto_B: 'campB',
  field_viewer_A: 'campA',
  treasurer: 'campA', // arbitrário — treasurer trata os dois camps como "own"
  viewer: 'campA',
  admin: 'campA',
}

let recibo = 10000 // contador global — só precisa de ser único por campo, mas simplifica não colidir com nada

describe.skipIf(!cfg)('Role matrix — despesas (read/create/update/delete)', () => {
  let fixtures: CreatedFixtures | undefined
  let anon: SupabaseClient
  let admin: SupabaseClient
  let campA: string
  let campB: string

  beforeAll(async () => {
    anon = anonClient(cfg!)
    fixtures = await createFixtures(cfg!)
    campA = fixtures.camps.campA
    campB = fixtures.camps.campB
    admin = fixtures.clients.admin

    // Semear uma despesa "baseline" em cada campo ANTES de qualquer teste
    // de READ correr — sem isto, um DENY passaria trivialmente mesmo com
    // RLS mal configurada, só porque o campo ainda não tinha nenhuma linha
    // para esconder.
    await admin.from('despesas').insert(despesaPayload(campA))
    await admin.from('despesas').insert(despesaPayload(campB))
  }, 30000)

  afterAll(async () => {
    if (fixtures) await teardownFixtures(fixtures)
  }, 30000)

  function despesaPayload(campoId: string, extra: Record<string, unknown> = {}) {
    recibo += 1
    return {
      campo_id: campoId,
      numero_recibo: recibo,
      data: '2026-07-01',
      valor: 1,
      codigo: '3.1.1',
      codigo_descricao: 'Alimentação | Compras Gerais',
      tipo: 'despesa',
      ...extra,
    }
  }

  async function seedDespesa(campoId: string): Promise<string> {
    const { data, error } = await admin.from('despesas').insert(despesaPayload(campoId)).select('id').single()
    if (error || !data) throw new Error(`seedDespesa falhou: ${error?.message}`)
    return data.id as string
  }

  // ── Casos gerados a partir da matriz ──────────────────────────────────
  type Case = { role: FixtureRoleKey | 'anon'; campKey: 'campA' | 'campB'; rel: 'own' | 'other'; cap: Cap }
  const cases: Case[] = []
  for (const role of Object.keys(MATRIX) as FixtureRoleKey[]) {
    const own = OWN_CAMP[role]
    const other = own === 'campA' ? 'campB' : 'campA'
    cases.push({ role, campKey: own, rel: 'own', cap: MATRIX[role].own })
    cases.push({ role, campKey: other, rel: 'other', cap: MATRIX[role].other })
  }
  for (const campKey of ['campA', 'campB'] as const) {
    cases.push({ role: 'anon', campKey, rel: 'other', cap: { read: false, write: false, del: false } })
  }

  describe.each(cases)('$role × $campKey ($rel)', ({ role, campKey, cap }) => {
    it(`READ — esperado ${cap.read ? 'ALLOW' : 'DENY'}`, async () => {
      const campoId = campKey === 'campA' ? campA : campB
      const client = role === 'anon' ? anon : fixtures!.clients[role]
      // Testa contra a linha "baseline" semeada em beforeAll — garante que
      // há mesmo algo para ver/esconder, nunca um campo vazio por acaso.
      const { data, error } = await client.from('despesas').select('id').eq('campo_id', campoId)
      if (cap.read) {
        expect(error).toBeFalsy()
        expect((data ?? []).length).toBeGreaterThan(0)
      } else {
        expect(error || (data ?? []).length === 0).toBeTruthy()
      }
    })

    it(`CREATE — esperado ${cap.write ? 'ALLOW' : 'DENY'}`, async () => {
      const campoId = campKey === 'campA' ? campA : campB
      const client = role === 'anon' ? anon : fixtures!.clients[role]
      const payload = despesaPayload(campoId)
      const { data, error } = await client.from('despesas').insert(payload).select('id').single()
      if (cap.write) {
        expect(error).toBeFalsy()
        expect(data?.id).toBeTruthy()
      } else {
        expect(error || !data).toBeTruthy()
        // Confirma por admin que nada ficou lá (RLS pode devolver sucesso
        // silencioso com 0 linhas em vez de erro, em alguns caminhos).
        const check = await admin.from('despesas').select('id').eq('campo_id', campoId).eq('numero_recibo', payload.numero_recibo)
        expect(check.data ?? []).toHaveLength(0)
      }
    })

    it(`UPDATE — esperado ${cap.write ? 'ALLOW' : 'DENY'}`, async () => {
      const campoId = campKey === 'campA' ? campA : campB
      const client = role === 'anon' ? anon : fixtures!.clients[role]
      const despesaId = await seedDespesa(campoId)
      const marker = `[TEST] update-by-${role}`
      await client.from('despesas').update({ descricao: marker }).eq('id', despesaId)

      const { data: after } = await admin.from('despesas').select('descricao').eq('id', despesaId).single()
      if (cap.write) {
        expect(after?.descricao).toBe(marker)
      } else {
        expect(after?.descricao).not.toBe(marker)
      }
    })

    it(`DELETE — esperado ${cap.del ? 'ALLOW' : 'DENY'}`, async () => {
      const campoId = campKey === 'campA' ? campA : campB
      const client = role === 'anon' ? anon : fixtures!.clients[role]
      const despesaId = await seedDespesa(campoId)
      await client.from('despesas').delete().eq('id', despesaId)

      const { data: after } = await admin.from('despesas').select('id').eq('id', despesaId)
      if (cap.del) {
        expect(after ?? []).toHaveLength(0)
      } else {
        expect(after ?? []).toHaveLength(1)
      }
    })
  })

  describe('Manipulação de ID entre campos (spoofing)', () => {
    it('adjunto_A não consegue UPDATE numa despesa cujo campo_id é B, mesmo enviando o payload correto', async () => {
      const despesaBId = await seedDespesa(campB)
      await fixtures!.clients.adjunto_A.from('despesas').update({ descricao: '[TEST] spoof' }).eq('id', despesaBId)
      const { data: after } = await admin.from('despesas').select('descricao').eq('id', despesaBId).single()
      expect(after?.descricao).not.toBe('[TEST] spoof')
    })

    it('adjunto_A não consegue DELETE uma despesa cujo campo_id é B, só por saber o ID', async () => {
      const despesaBId = await seedDespesa(campB)
      await fixtures!.clients.adjunto_A.from('despesas').delete().eq('id', despesaBId)
      const { data: after } = await admin.from('despesas').select('id').eq('id', despesaBId)
      expect(after ?? []).toHaveLength(1)
    })

    it('field_viewer_A não consegue UPDATE mesmo no seu próprio campo A (role read-only)', async () => {
      const despesaAId = await seedDespesa(campA)
      await fixtures!.clients.field_viewer_A.from('despesas').update({ descricao: '[TEST] spoof' }).eq('id', despesaAId)
      const { data: after } = await admin.from('despesas').select('descricao').eq('id', despesaAId).single()
      expect(after?.descricao).not.toBe('[TEST] spoof')
    })
  })
})

if (!cfg) {
  describe('Role matrix — despesas', () => {
    it.skip('SKIP — sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY nem TEST_SUPABASE_URL configurados', () => {})
  })
}
