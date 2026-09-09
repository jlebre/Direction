/**
 * FASE 2 (fecho) — matriz comportamental de Storage (bucket `faturas`),
 * pedida explicitamente antes de considerar a Fase 2 concluída: "A
 * segurança deve vir da Storage RLS, não da UI."
 *
 * Resultado real medido aqui (introspecção confirmada em `pg_policies`):
 * as policies do bucket `faturas` são `bucket_id = 'faturas'` para
 * `{public}` em SELECT/INSERT/DELETE — SEM qualquer segmentação por
 * caminho/campo. Isto é a consequência direta e já documentada da decisão
 * "Opção A — manter público" da subfase 2.5 (ver docs/v2/MIGRATION_STRATEGY.md):
 * o bucket serve URLs públicas sem passar pela RLS, e por isso não há
 * meio-termo por campo enquanto isso for verdade — nem para leitura, nem
 * (achado desta suite) para escrita.
 *
 * Os casos que a matriz pedida pelo utilizador espera como DENY mas que
 * hoje são ALLOW usam `it.fails(...)`, exactamente como
 * `anon-read-baseline.test.ts` já faz — sinaliza "conhecido, não é uma
 * regressão desta suite, aguarda a privatização do bucket (signed URLs)",
 * sem maquilhar o resultado real.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createFixtures, findOrphanedTestFixtures, teardownFixtures, type CreatedFixtures } from './fixtures'
import { getTestSupabaseConfig, PRODUCTION_ANON_KEY, PRODUCTION_URL } from './env'
import type { SupabaseClient } from '@supabase/supabase-js'

const hasProdConfig = Boolean(PRODUCTION_URL && PRODUCTION_ANON_KEY)
const dedicatedTestEnv = getTestSupabaseConfig()
const cfg = dedicatedTestEnv ?? (hasProdConfig ? { url: PRODUCTION_URL!, anonKey: PRODUCTION_ANON_KEY!, serviceRoleKey: undefined } : null)

function slugOf(nome: string): string {
  // Réplica de getCampoSlug() (src/lib/adjuntos/supabase-storage.ts).
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

afterAll(() => {
  if (!cfg) return
  const orphans = findOrphanedTestFixtures()
  if (orphans.camps.length > 0 || orphans.users.length > 0) {
    throw new Error(
      `Sobraram fixtures [TEST] depois da suite (limpar manualmente estes IDs exatos): ${JSON.stringify(orphans)}`
    )
  }
})

describe.skipIf(!cfg)('Role matrix — Storage (bucket faturas)', () => {
  let fixtures: CreatedFixtures | undefined
  let anon: SupabaseClient
  let slugA: string
  let slugB: string
  const uploaded: string[] = [] // todos os paths criados por esta suite — limpos no afterAll, sempre

  beforeAll(async () => {
    anon = anonClient(cfg!)
    fixtures = await createFixtures(cfg!)

    // fixtures.ts não devolve o nome do campo (só o id) — lê-lo para
    // calcular o slug real (inclui o runId gerado por createFixtures).
    const { runSql } = await import('./sql')
    const rowsA = runSql(`select nome from campos where id = '${fixtures.camps.campA}';`)
    const rowsB = runSql(`select nome from campos where id = '${fixtures.camps.campB}';`)
    slugA = slugOf(rowsA[0].nome as string)
    slugB = slugOf(rowsB[0].nome as string)

    // Baseline: um ficheiro em cada campo, feito por admin (ground truth).
    const body = new Blob(['[TEST] fixture'], { type: 'text/plain' })
    const pathA = `${slugA}/baseline.txt`
    const pathB = `${slugB}/baseline.txt`
    await fixtures.clients.admin.storage.from('faturas').upload(pathA, body, { upsert: true })
    await fixtures.clients.admin.storage.from('faturas').upload(pathB, body, { upsert: true })
    uploaded.push(pathA, pathB)
  }, 30000)

  afterAll(async () => {
    // Limpeza de Storage SEMPRE primeiro (não é cascata da BD) — remove
    // TUDO o que esta suite possa ter criado nas duas pastas, mesmo o que
    // "não devia" ter sido possível (é precisamente isso que a suite mede).
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

  function track(path: string) {
    uploaded.push(path)
    return path
  }

  // ── O que É esperado e É verdade hoje (sem it.fails) ──────────────────
  describe('Comportamento esperado e confirmado', () => {
    it('adjunto_A lê (list) a pasta do seu próprio campo', async () => {
      const { data, error } = await fixtures!.clients.adjunto_A.storage.from('faturas').list(slugA)
      expect(error).toBeFalsy()
      expect((data ?? []).length).toBeGreaterThan(0)
    })

    it('adjunto_A faz upload no seu próprio campo', async () => {
      const path = track(`${slugA}/adjunto-a-upload.txt`)
      const { error } = await fixtures!.clients.adjunto_A.storage
        .from('faturas')
        .upload(path, new Blob(['x']), { upsert: true })
      expect(error).toBeFalsy()
    })

    it('treasurer lê e escreve em ambos os campos, sem membership em nenhum', async () => {
      const t = fixtures!.clients.treasurer
      const listA = await t.storage.from('faturas').list(slugA)
      const listB = await t.storage.from('faturas').list(slugB)
      expect(listA.error).toBeFalsy()
      expect(listB.error).toBeFalsy()
      const path = track(`${slugB}/treasurer-upload.txt`)
      const up = await t.storage.from('faturas').upload(path, new Blob(['x']), { upsert: true })
      expect(up.error).toBeFalsy()
    })

    it('admin lê e escreve em ambos os campos', async () => {
      const a = fixtures!.clients.admin
      const path = track(`${slugA}/admin-upload.txt`)
      const up = await a.storage.from('faturas').upload(path, new Blob(['x']), { upsert: true })
      expect(up.error).toBeFalsy()
    })

    it('viewer lê ambos os campos', async () => {
      const v = fixtures!.clients.viewer
      const listA = await v.storage.from('faturas').list(slugA)
      const listB = await v.storage.from('faturas').list(slugB)
      expect(listA.error).toBeFalsy()
      expect(listB.error).toBeFalsy()
    })

    it('field_viewer_A lê o seu campo', async () => {
      const { data, error } = await fixtures!.clients.field_viewer_A.storage.from('faturas').list(slugA)
      expect(error).toBeFalsy()
      expect((data ?? []).length).toBeGreaterThan(0)
    })
  })

  // ── O que a matriz pedida espera (DENY) mas a decisão "Opção A" — bucket
  // público, sem segmentação por caminho — ainda não permite garantir ─────
  describe('EXPECTED FAIL — Storage ainda não segmenta por campo (decisão "Opção A", subfase 2.5)', () => {
    it.fails('adjunto_A NÃO deveria listar a pasta do Camp B', async () => {
      const { error, data } = await fixtures!.clients.adjunto_A.storage.from('faturas').list(slugB)
      expect(Boolean(error) || (data ?? []).length === 0).toBe(true)
    })

    it.fails('adjunto_A NÃO deveria conseguir upload na pasta do Camp B', async () => {
      const path = track(`${slugB}/adjunto-a-cross-upload.txt`)
      const { error } = await fixtures!.clients.adjunto_A.storage
        .from('faturas')
        .upload(path, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
    })

    it.fails('adjunto_A NÃO deveria conseguir apagar um ficheiro do Camp B', async () => {
      const { error } = await fixtures!.clients.adjunto_A.storage.from('faturas').remove([`${slugB}/baseline.txt`])
      expect(Boolean(error)).toBe(true)
      // Reposto no afterAll global (upload de novo por admin) — mas para
      // não depender disso, confirma-se já aqui que a remoção é revertida:
      await fixtures!.clients.admin.storage
        .from('faturas')
        .upload(`${slugB}/baseline.txt`, new Blob(['[TEST] fixture']), { upsert: true })
    })

    it.fails('field_viewer_A (read-only) NÃO deveria conseguir upload mesmo no seu próprio campo', async () => {
      const path = track(`${slugA}/field-viewer-upload.txt`)
      const { error } = await fixtures!.clients.field_viewer_A.storage
        .from('faturas')
        .upload(path, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
    })

    it.fails('viewer (read-only) NÃO deveria conseguir upload em nenhum campo', async () => {
      const path = track(`${slugA}/viewer-upload.txt`)
      const { error } = await fixtures!.clients.viewer.storage
        .from('faturas')
        .upload(path, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
    })
  })

  describe('anon (sem sessão)', () => {
    it.fails('anon NÃO deveria listar a pasta de nenhum campo de teste', async () => {
      const { error, data } = await anon.storage.from('faturas').list(slugA)
      expect(Boolean(error) || (data ?? []).length === 0).toBe(true)
    })

    it.fails('anon NÃO deveria conseguir upload em nenhum campo', async () => {
      const path = track(`${slugA}/anon-upload.txt`)
      const { error } = await anon.storage.from('faturas').upload(path, new Blob(['x']), { upsert: true })
      expect(Boolean(error)).toBe(true)
    })

    it.fails('anon NÃO deveria conseguir apagar ficheiros', async () => {
      const path = track(`${slugA}/anon-delete-target.txt`)
      await fixtures!.clients.admin.storage.from('faturas').upload(path, new Blob(['x']), { upsert: true })
      const { error } = await anon.storage.from('faturas').remove([path])
      expect(Boolean(error)).toBe(true)
    })
  })
})

if (!cfg) {
  describe('Role matrix — Storage', () => {
    it.skip('SKIP — sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY nem TEST_SUPABASE_URL configurados', () => {})
  })
}
