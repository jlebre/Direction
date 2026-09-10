/**
 * FASE 2 — Camp Access Links, nível BD (RPCs SECURITY DEFINER da migration
 * 045/046). Complementa `tests/e2e/camp-access-links.spec.ts`, que testa o
 * fluxo real de bootstrap por browser (cookie, redirect).
 *
 * Usa as fixtures [TEST] Camp A/B já existentes (tests/security/fixtures.ts)
 * — `admin`/`treasurer` para gerir links, `anon` para simular o Adjunto
 * (uma Camp Access Session nunca tem sessão Supabase Auth).
 */
import { createHash, randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createFixtures, findOrphanedTestFixtures, teardownFixtures, type CreatedFixtures } from './fixtures'
import { getTestSupabaseConfig, PRODUCTION_ANON_KEY, PRODUCTION_URL } from './env'
import type { SupabaseClient } from '@supabase/supabase-js'

const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)
const dedicatedTestEnv = getTestSupabaseConfig()
const cfg = dedicatedTestEnv ?? (hasProdConfig ? { url: PRODUCTION_URL!, anonKey: PRODUCTION_ANON_KEY!, serviceRoleKey: undefined } : null)

function freshToken() {
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

afterAll(() => {
  if (!cfg) return
  const orphans = findOrphanedTestFixtures()
  if (orphans.camps.length > 0 || orphans.users.length > 0) {
    throw new Error(`Sobraram fixtures [TEST] depois da suite: ${JSON.stringify(orphans)}`)
  }
})

describe.skipIf(!cfg)('Camp Access Links (RPCs)', () => {
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

  afterAll(async () => {
    if (fixtures) await teardownFixtures(fixtures)
  }, 30000)

  async function createLinkFor(campId: string) {
    const { token, hash } = freshToken()
    const { data: linkId, error } = await fixtures!.clients.admin.rpc('camp_access_create_link', {
      p_camp_id: campId,
      p_token_hash: hash,
      p_expires_at: null,
    })
    if (error) throw new Error(`createLinkFor falhou: ${error.message}`)
    return { token, hash, linkId: linkId as string }
  }

  it('treasurer também consegue gerar um link (não só admin)', async () => {
    const { hash } = freshToken()
    const { error } = await fixtures!.clients.treasurer.rpc('camp_access_create_link', {
      p_camp_id: campA,
      p_token_hash: hash,
      p_expires_at: null,
    })
    expect(error).toBeFalsy()
  })

  it('adjunto_A (staff/camp_membership) NÃO consegue gerar um link — só admin/treasurer', async () => {
    const { hash } = freshToken()
    const { error } = await fixtures!.clients.adjunto_A.rpc('camp_access_create_link', {
      p_camp_id: campA,
      p_token_hash: hash,
      p_expires_at: null,
    })
    expect(error).toBeTruthy()
  })

  it('bootstrap: token válido resolve o camp_id certo e actualiza last_used_at', async () => {
    const { hash, linkId } = await createLinkFor(campB)
    const { data, error } = await anon.rpc('camp_access_bootstrap', { p_token_hash: hash }).maybeSingle()
    expect(error).toBeFalsy()
    expect((data as { camp_id: string } | null)?.camp_id).toBe(campB)

    const { data: row } = await fixtures!.clients.admin
      .from('camp_access_links')
      .select('last_used_at')
      .eq('id', linkId)
      .single()
    expect(row?.last_used_at).toBeTruthy()
  })

  it('bootstrap: token inválido (nunca existiu) devolve vazio, não erro', async () => {
    const { hash } = freshToken()
    const { data, error } = await anon.rpc('camp_access_bootstrap', { p_token_hash: hash }).maybeSingle()
    expect(error).toBeFalsy()
    expect(data).toBeNull()
  })

  it('bootstrap: token expirado é recusado', async () => {
    const { token, hash } = freshToken()
    void token
    const past = new Date(Date.now() - 60_000).toISOString()
    const { error: createErr } = await fixtures!.clients.admin.rpc('camp_access_create_link', {
      p_camp_id: campA,
      p_token_hash: hash,
      p_expires_at: past,
    })
    expect(createErr).toBeFalsy()
    const { data } = await anon.rpc('camp_access_bootstrap', { p_token_hash: hash }).maybeSingle()
    expect(data).toBeNull()
  })

  it('bootstrap: token revogado é recusado', async () => {
    const { hash, linkId } = await createLinkFor(campA)
    const { error: revokeErr } = await fixtures!.clients.admin.rpc('camp_access_revoke_link', { p_link_id: linkId })
    expect(revokeErr).toBeFalsy()
    const { data } = await anon.rpc('camp_access_bootstrap', { p_token_hash: hash }).maybeSingle()
    expect(data).toBeNull()
  })

  it('regenerar: link antigo passa a DENY, o novo é ALLOW', async () => {
    const first = await createLinkFor(campA)
    const { data: firstResolve } = await anon.rpc('camp_access_bootstrap', { p_token_hash: first.hash }).maybeSingle()
    expect((firstResolve as { camp_id: string } | null)?.camp_id).toBe(campA)

    // Regenerar = criar um novo link para o MESMO campo — a RPC revoga o
    // anterior automaticamente (ver camp_access_create_link, migration 045).
    const second = await createLinkFor(campA)

    const { data: firstAfter } = await anon.rpc('camp_access_bootstrap', { p_token_hash: first.hash }).maybeSingle()
    expect(firstAfter).toBeNull() // antigo -> DENY

    const { data: secondResolve } = await anon.rpc('camp_access_bootstrap', { p_token_hash: second.hash }).maybeSingle()
    expect((secondResolve as { camp_id: string } | null)?.camp_id).toBe(campA) // novo -> ALLOW

    // Sessão (link_id) do link antigo também deixa de ser válida — não só o bootstrap futuro.
    const { data: oldSessionCampId } = await anon.rpc('camp_access_camp_id', { p_link_id: first.linkId })
    expect(oldSessionCampId).toBeNull()
  })

  it('camp_access_camp_id: sessão do próprio campo resolve; nunca devolve outro campo', async () => {
    const { linkId } = await createLinkFor(campA)
    const { data: resolved } = await anon.rpc('camp_access_camp_id', { p_link_id: linkId })
    expect(resolved).toBe(campA)
    expect(resolved).not.toBe(campB)
  })

  describe('despesas via camp_access (RPCs da migration 045)', () => {
    it('cria, lê, edita e apaga uma despesa no PRÓPRIO campo — ciclo completo', async () => {
      const { linkId } = await createLinkFor(campA)
      const { data: created, error: createErr } = await anon.rpc('camp_access_create_despesa', {
        p_link_id: linkId,
        p_payload: { data: '2026-07-01', valor: 12.5, descricao: '[TEST] via link', codigo: '3.1.1', codigo_descricao: 'Alimentação | Compras Gerais', nifConfirmado: false, fotoPath: null, ocrStatus: 'nenhum', ocrTexto: null, ocrFornecedor: null, ocrTotal: null, ocrData: null, origemDados: 'manual', nifVisivel: false, qrRaw: null, qrTotal: null, qrData: null, qrNifEmitente: null, qrNifAdquirente: null, qrNumeroDocumento: null, qrAtcud: null, qrTipoDocumento: null },
      })
      expect(createErr).toBeFalsy()
      const despesaId = (created as { despesa_id: string }[])[0].despesa_id

      const { data: read } = await anon.rpc('camp_access_get_despesa', { p_link_id: linkId, p_despesa_id: despesaId })
      expect(Number((read as { valor: number }[])[0]?.valor)).toBeCloseTo(12.5, 2)

      const { error: updateErr } = await anon.rpc('camp_access_update_despesa', {
        p_link_id: linkId,
        p_despesa_id: despesaId,
        p_payload: { valor: 20, descricao: '[TEST] editado', data: '2026-07-01', codigo: '3.1.1', codigo_descricao: 'Alimentação | Compras Gerais', nifConfirmado: false, fotoPath: null },
      })
      expect(updateErr).toBeFalsy()
      const { data: afterUpdate } = await fixtures!.clients.admin.from('despesas').select('valor').eq('id', despesaId).single()
      expect(Number(afterUpdate?.valor)).toBeCloseTo(20, 2)

      const { error: deleteErr } = await anon.rpc('camp_access_delete_despesa', { p_link_id: linkId, p_despesa_id: despesaId })
      expect(deleteErr).toBeFalsy()
      const { data: afterDelete } = await fixtures!.clients.admin.from('despesas').select('id').eq('id', despesaId)
      expect(afterDelete ?? []).toHaveLength(0)
    })

    it('link do Camp A NÃO consegue ler/editar/apagar uma despesa do Camp B', async () => {
      const { linkId: linkA } = await createLinkFor(campA)
      const { data: despesaB, error: seedErr } = await fixtures!.clients.admin.rpc('camp_access_create_despesa', {
        p_link_id: (await createLinkFor(campB)).linkId,
        p_payload: { data: '2026-07-01', valor: 5, descricao: '[TEST] Camp B', codigo: '3.1.1', codigo_descricao: 'x', nifConfirmado: false, fotoPath: null, ocrStatus: 'nenhum', ocrTexto: null, ocrFornecedor: null, ocrTotal: null, ocrData: null, origemDados: 'manual', nifVisivel: false, qrRaw: null, qrTotal: null, qrData: null, qrNifEmitente: null, qrNifAdquirente: null, qrNumeroDocumento: null, qrAtcud: null, qrTipoDocumento: null },
      })
      expect(seedErr).toBeFalsy()
      const despesaBId = (despesaB as { despesa_id: string }[])[0].despesa_id

      const { data: readAttempt } = await anon.rpc('camp_access_get_despesa', { p_link_id: linkA, p_despesa_id: despesaBId })
      expect((readAttempt as unknown[]) ?? []).toHaveLength(0)

      const { error: updateErr } = await anon.rpc('camp_access_update_despesa', {
        p_link_id: linkA,
        p_despesa_id: despesaBId,
        p_payload: { valor: 999, descricao: '[TEST] spoof', data: '2026-07-01', codigo: 'x', codigo_descricao: 'x', nifConfirmado: false, fotoPath: null },
      })
      expect(updateErr).toBeTruthy()

      const { error: deleteErr } = await anon.rpc('camp_access_delete_despesa', { p_link_id: linkA, p_despesa_id: despesaBId })
      expect(deleteErr).toBeTruthy()

      const { data: stillThere } = await fixtures!.clients.admin.from('despesas').select('id').eq('id', despesaBId)
      expect(stillThere ?? []).toHaveLength(1)
    })

    it('token/link inválido (nunca criado) não consegue criar despesa em nenhum campo', async () => {
      const fakeLinkId = '00000000-0000-0000-0000-000000000000'
      const { error } = await anon.rpc('camp_access_create_despesa', {
        p_link_id: fakeLinkId,
        p_payload: { data: '2026-07-01', valor: 1, descricao: null, codigo: 'x', codigo_descricao: 'x', nifConfirmado: false, fotoPath: null, ocrStatus: 'nenhum', ocrTexto: null, ocrFornecedor: null, ocrTotal: null, ocrData: null, origemDados: 'manual', nifVisivel: false, qrRaw: null, qrTotal: null, qrData: null, qrNifEmitente: null, qrNifAdquirente: null, qrNumeroDocumento: null, qrAtcud: null, qrTipoDocumento: null },
      })
      expect(error).toBeTruthy()
    })
  })
})

if (!cfg) {
  describe('Camp Access Links', () => {
    it.skip('SKIP — sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY nem TEST_SUPABASE_URL configurados', () => {})
  })
}
