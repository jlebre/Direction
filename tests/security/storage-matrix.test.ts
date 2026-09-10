/**
 * FASE 2.8 (fecho — isolamento de Storage) — matriz comportamental do bucket
 * `faturas`, agora testando o comportamento REAL depois da migration 044:
 * bucket privado, `storage_slug` por campo, policies SELECT/INSERT/UPDATE/
 * DELETE camp-scoped (ver supabase/migrations/044_storage_isolation.sql).
 *
 * Substitui a versão anterior desta suite, que documentava (via
 * `it.fails(...)`) que o bucket não isolava nada — essa suite passava por
 * confirmar o gap; esta passa por confirmar que o gap foi fechado.
 *
 * As fixtures `campA`/`campB` de `tests/security/fixtures.ts` NÃO têm
 * `legacy_anon_access` (default `false`) — por isso testam o limite real e
 * definitivo (camp_membership), não a exceção legacy que os 11 campos reais
 * ainda usam hoje.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createFixtures, findOrphanedTestFixtures, teardownFixtures, type CreatedFixtures } from './fixtures'
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

describe.skipIf(!cfg)('Role matrix — Storage (bucket faturas, privado desde a migration 044)', () => {
  let fixtures: CreatedFixtures | undefined
  let anon: SupabaseClient
  let slugA: string
  let slugB: string

  beforeAll(async () => {
    anon = anonClient(cfg!)
    fixtures = await createFixtures(cfg!)

    // storage_slug é preenchido automaticamente pela trigger da migration
    // 044 — lê-lo em vez de recalcular, para o teste depender exactamente
    // do mesmo valor que as policies usam.
    const { runSql } = await import('./sql')
    const rowsA = runSql(`select storage_slug from campos where id = '${fixtures.camps.campA}';`)
    const rowsB = runSql(`select storage_slug from campos where id = '${fixtures.camps.campB}';`)
    slugA = rowsA[0].storage_slug as string
    slugB = rowsB[0].storage_slug as string
    expect(slugA).toBeTruthy()
    expect(slugB).toBeTruthy()

    // Baseline: um ficheiro em cada campo, feito por admin (ground truth).
    const body = new Blob(['[TEST] fixture'], { type: 'text/plain' })
    await fixtures.clients.admin.storage.from('faturas').upload(`${slugA}/baseline.txt`, body, { upsert: true })
    await fixtures.clients.admin.storage.from('faturas').upload(`${slugB}/baseline.txt`, body, { upsert: true })
  }, 30000)

  afterAll(async () => {
    // Limpeza de Storage SEMPRE primeiro (não é cascata da BD).
    if (fixtures) {
      const admin = fixtures.clients.admin
      for (const slug of [slugA, slugB]) {
        const { data: files } = await admin.storage.from('faturas').list(slug)
        if (files && files.length > 0) {
          await admin.storage.from('faturas').remove(files.map((f) => `${slug}/${f.name}`))
        }
      }
      await teardownFixtures(fixtures)
    }
  }, 30000)

  describe('Próprio campo — ALLOW conforme o papel', () => {
    it('adjunto_A lê (list) e faz upload na pasta do seu próprio campo', async () => {
      const { data, error } = await fixtures!.clients.adjunto_A.storage.from('faturas').list(slugA)
      expect(error).toBeFalsy()
      expect((data ?? []).length).toBeGreaterThan(0)

      const up = await fixtures!.clients.adjunto_A.storage
        .from('faturas')
        .upload(`${slugA}/adjunto-a-upload.txt`, new Blob(['x']), { upsert: true })
      expect(up.error).toBeFalsy()
    })

    it('adjunto_A NÃO consegue apagar mesmo no seu próprio campo (mesma regra de despesas_delete)', async () => {
      const path = `${slugA}/adjunto-a-delete-target.txt`
      await fixtures!.clients.admin.storage.from('faturas').upload(path, new Blob(['x']), { upsert: true })
      const { error } = await fixtures!.clients.adjunto_A.storage.from('faturas').remove([path])
      // RLS de DELETE filtra silenciosamente (sem erro) — confirmar por
      // admin que o ficheiro continua lá, nunca só pelo `error`.
      void error
      const { data: after } = await fixtures!.clients.admin.storage.from('faturas').list(slugA, { search: 'adjunto-a-delete-target.txt' })
      expect((after ?? []).some((f) => f.name === 'adjunto-a-delete-target.txt')).toBe(true)
    })

    it('field_viewer_A lê o seu campo, mas não escreve', async () => {
      const { data, error } = await fixtures!.clients.field_viewer_A.storage.from('faturas').list(slugA)
      expect(error).toBeFalsy()
      expect((data ?? []).length).toBeGreaterThan(0)
    })

    it('treasurer lê e escreve em ambos os campos, sem membership em nenhum', async () => {
      const t = fixtures!.clients.treasurer
      const listA = await t.storage.from('faturas').list(slugA)
      const listB = await t.storage.from('faturas').list(slugB)
      expect(listA.error).toBeFalsy()
      expect(listB.error).toBeFalsy()
      const up = await t.storage.from('faturas').upload(`${slugB}/treasurer-upload.txt`, new Blob(['x']), { upsert: true })
      expect(up.error).toBeFalsy()
    })

    it('treasurer consegue apagar (mesma regra de despesas_delete — admin/treasurer podem)', async () => {
      const path = `${slugB}/treasurer-delete-target.txt`
      await fixtures!.clients.admin.storage.from('faturas').upload(path, new Blob(['x']), { upsert: true })
      const { error } = await fixtures!.clients.treasurer.storage.from('faturas').remove([path])
      expect(error).toBeFalsy()
      const { data: after } = await fixtures!.clients.admin.storage.from('faturas').list(slugB, { search: 'treasurer-delete-target.txt' })
      expect((after ?? []).some((f) => f.name === 'treasurer-delete-target.txt')).toBe(false)
    })

    it('admin lê e escreve em ambos os campos', async () => {
      const up = await fixtures!.clients.admin.storage.from('faturas').upload(`${slugA}/admin-upload.txt`, new Blob(['x']), { upsert: true })
      expect(up.error).toBeFalsy()
    })

    it('viewer lê ambos os campos', async () => {
      const v = fixtures!.clients.viewer
      const listA = await v.storage.from('faturas').list(slugA)
      const listB = await v.storage.from('faturas').list(slugB)
      expect(listA.error).toBeFalsy()
      expect(listB.error).toBeFalsy()
    })
  })

  // ── O limite que a migration 044 fecha: campo do OUTRO, sem legacy ─────
  describe('Cross-camp — DENY (fechado pela migration 044)', () => {
    it('adjunto_A NÃO lista a pasta do Camp B', async () => {
      const { error, data } = await fixtures!.clients.adjunto_A.storage.from('faturas').list(slugB)
      expect(Boolean(error) || (data ?? []).length === 0).toBe(true)
    })

    it('adjunto_A NÃO consegue upload na pasta do Camp B (path spoofing)', async () => {
      const { error } = await fixtures!.clients.adjunto_A.storage
        .from('faturas')
        .upload(`${slugB}/adjunto-a-cross-upload.txt`, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
      const { data: after } = await fixtures!.clients.admin.storage.from('faturas').list(slugB, { search: 'adjunto-a-cross-upload.txt' })
      expect(after ?? []).toHaveLength(0)
    })

    it('adjunto_A NÃO consegue apagar um ficheiro do Camp B', async () => {
      const { error } = await fixtures!.clients.adjunto_A.storage.from('faturas').remove([`${slugB}/baseline.txt`])
      void error
      const { data: after } = await fixtures!.clients.admin.storage.from('faturas').list(slugB, { search: 'baseline.txt' })
      expect((after ?? []).some((f) => f.name === 'baseline.txt')).toBe(true)
    })

    it('field_viewer_A NÃO lê a pasta do Camp B', async () => {
      const { error, data } = await fixtures!.clients.field_viewer_A.storage.from('faturas').list(slugB)
      expect(Boolean(error) || (data ?? []).length === 0).toBe(true)
    })

    it('field_viewer_A (read-only) NÃO consegue upload mesmo no seu próprio campo', async () => {
      const { error } = await fixtures!.clients.field_viewer_A.storage
        .from('faturas')
        .upload(`${slugA}/field-viewer-upload.txt`, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
    })

    it('viewer (read-only) NÃO consegue upload em nenhum campo', async () => {
      const { error } = await fixtures!.clients.viewer.storage
        .from('faturas')
        .upload(`${slugA}/viewer-upload.txt`, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
    })
  })

  describe('anon (sem sessão, campo sem legacy_anon_access)', () => {
    it('anon NÃO lista a pasta de nenhum campo de teste', async () => {
      const { error, data } = await anon.storage.from('faturas').list(slugA)
      expect(Boolean(error) || (data ?? []).length === 0).toBe(true)
    })

    it('anon NÃO consegue upload em nenhum campo', async () => {
      const { error } = await anon.storage.from('faturas').upload(`${slugA}/anon-upload.txt`, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
    })

    it('anon NÃO consegue apagar ficheiros', async () => {
      const path = `${slugA}/anon-delete-target.txt`
      await fixtures!.clients.admin.storage.from('faturas').upload(path, new Blob(['x']), { upsert: true })
      const { error } = await anon.storage.from('faturas').remove([path])
      void error
      const { data: after } = await fixtures!.clients.admin.storage.from('faturas').list(slugA, { search: 'anon-delete-target.txt' })
      expect((after ?? []).some((f) => f.name === 'anon-delete-target.txt')).toBe(true)
    })

    it('anon NÃO consegue gerar uma signed URL válida para um campo sem acesso', async () => {
      const { error } = await anon.storage.from('faturas').createSignedUrl(`${slugA}/baseline.txt`, 60)
      expect(Boolean(error)).toBe(true)
    })
  })
})

if (!cfg) {
  describe('Role matrix — Storage', () => {
    it.skip('SKIP — sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY nem TEST_SUPABASE_URL configurados', () => {})
  })
}
