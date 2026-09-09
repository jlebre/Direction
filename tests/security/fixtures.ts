/**
 * FASE 2.3+ — fixtures comportamentais reais para a matriz de autorização.
 *
 * Cria e apaga, em produção, objetos claramente marcados como teste:
 *   - 2 campos: nome começa por "[TEST] Camp A "/"[TEST] Camp B "
 *   - 6 utilizadores Auth: email termina em "@camtil.invalid" (TLD reservado
 *     pela RFC 2606 especificamente para nunca ser um domínio real/entregável)
 *
 * NÃO usa `service_role` nem nenhuma connection string direta — os
 * utilizadores de teste são criados por INSERT direto em auth.users/
 * auth.identities (com password conhecida, hashada com pgcrypto) e depois
 * autenticados normalmente via `signInWithPassword` com a chave anon, tal
 * como qualquer utilizador real autenticaria. `handle_new_user()` (migration
 * 038) cria o `profiles` correspondente automaticamente.
 *
 * Teardown apaga só os IDs que este módulo criou (nunca uma query "apanha
 * tudo que pareça de teste") — apagar `auth.users` em cascata remove
 * identities/profiles/camp_memberships; apagar `campos` em cascata remove
 * qualquer despesa/linha/devolução de teste eventualmente criada sobre eles.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { TestSupabaseConfig } from './env'
import { runSql, type SqlRow } from './sql'

export type GlobalRole = 'admin' | 'treasurer' | 'viewer'
export type CampRole = 'adjunto' | 'field_viewer'

export type FixtureRoleKey = 'adjunto_A' | 'adjunto_B' | 'field_viewer_A' | 'treasurer' | 'viewer' | 'admin'

const TEST_PASSWORD = 'Test-Fixture-Pw-2026!'

const ROLE_SPECS: Record<
  FixtureRoleKey,
  { globalRole: GlobalRole | null; campKey: 'campA' | 'campB' | null; campRole: CampRole | null }
> = {
  adjunto_A: { globalRole: null, campKey: 'campA', campRole: 'adjunto' },
  adjunto_B: { globalRole: null, campKey: 'campB', campRole: 'adjunto' },
  field_viewer_A: { globalRole: null, campKey: 'campA', campRole: 'field_viewer' },
  treasurer: { globalRole: 'treasurer', campKey: null, campRole: null },
  viewer: { globalRole: 'viewer', campKey: null, campRole: null },
  admin: { globalRole: 'admin', campKey: null, campRole: null },
}

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

export function anonClient(cfg: TestSupabaseConfig): SupabaseClient {
  return createClient(cfg.url, cfg.anonKey)
}

export interface CreatedFixtures {
  clients: Record<FixtureRoleKey, SupabaseClient>
  camps: Record<'campA' | 'campB', string>
  userIds: Record<FixtureRoleKey, string>
}

export async function createFixtures(cfg: TestSupabaseConfig): Promise<CreatedFixtures> {
  const runId = Math.random().toString(36).slice(2, 8)
  const keys = Object.keys(ROLE_SPECS) as FixtureRoleKey[]

  // Estado parcial acumulado à medida que se cria — se qualquer passo
  // abaixo falhar, o catch limpa exatamente isto (nunca mais, nunca menos)
  // antes de propagar o erro. Nenhuma fixture criada fica órfã por uma
  // falha a meio.
  const partial: { campIds: string[]; userIds: string[] } = { campIds: [], userIds: [] }

  try {
    // ── 1. Campos de teste ────────────────────────────────────────────────
    const campARows = runSql(`
      insert into campos (nome, escalao, ano, setup_completo, saldo_inicial)
      values (${lit(`[TEST] Camp A ${runId}`)}, 'Aranhiço', 9999, true, 1000)
      returning id::text as id;
    `)
    const campA = campARows[0].id as string
    partial.campIds.push(campA)

    const campBRows = runSql(`
      insert into campos (nome, escalao, ano, setup_completo, saldo_inicial)
      values (${lit(`[TEST] Camp B ${runId}`)}, 'Aranhiço', 9999, true, 1000)
      returning id::text as id;
    `)
    const campB = campBRows[0].id as string
    partial.campIds.push(campB)

    const camps = { campA, campB }

    // ── 2. Utilizadores de teste (auth.users + auth.identities) ───────────
    const userIds: Partial<Record<FixtureRoleKey, string>> = {}
    const emails: Partial<Record<FixtureRoleKey, string>> = {}

    for (const key of keys) {
      const email = `zz-test-${key.toLowerCase().replace(/_/g, '-')}-${runId}@camtil.invalid`
      emails[key] = email
      const rows = runSql(`
        with new_user as (
          insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token,
            email_change_token_new, email_change
          ) values (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            ${lit(email)}, extensions.crypt(${lit(TEST_PASSWORD)}, extensions.gen_salt('bf')),
            now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
            now(), now(), '', '', '', ''
          ) returning id
        ), new_identity as (
          -- email é coluna GENERATED (derivada de identity_data) — não pode
          -- ser passada no INSERT.
          insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
          select gen_random_uuid(), id::text, id,
                 jsonb_build_object('sub', id::text, 'email', ${lit(email)}),
                 'email', now(), now()
          from new_user
          returning user_id
        )
        select id::text as user_id from new_user;
      `)
      const userId = rows[0].user_id as string
      userIds[key] = userId
      partial.userIds.push(userId)
    }

    // ── 3. global_role (profiles já existe via trigger handle_new_user) ───
    for (const key of keys) {
      const spec = ROLE_SPECS[key]
      if (spec.globalRole) {
        runSql(`update profiles set global_role = ${lit(spec.globalRole)} where id = ${lit(userIds[key]!)};`)
      }
    }

    // ── 4. camp_memberships ─────────────────────────────────────────────────
    for (const key of keys) {
      const spec = ROLE_SPECS[key]
      if (spec.campKey && spec.campRole) {
        runSql(`
          insert into camp_memberships (camp_id, user_id, role, status)
          values (${lit(camps[spec.campKey])}, ${lit(userIds[key]!)}, ${lit(spec.campRole)}, 'active');
        `)
      }
    }

    // ── 5. Login real (signInWithPassword, só chave anon) por fixture ─────
    const clients: Partial<Record<FixtureRoleKey, SupabaseClient>> = {}
    for (const key of keys) {
      const client = createClient(cfg.url, cfg.anonKey)
      const { error } = await client.auth.signInWithPassword({ email: emails[key]!, password: TEST_PASSWORD })
      if (error) {
        throw new Error(`Falha ao autenticar fixture '${key}' (${emails[key]}): ${error.message}`)
      }
      clients[key] = client
    }

    return {
      clients: clients as Record<FixtureRoleKey, SupabaseClient>,
      camps,
      userIds: userIds as Record<FixtureRoleKey, string>,
    }
  } catch (err) {
    if (partial.userIds.length > 0) {
      runSql(`delete from auth.users where id in (${partial.userIds.map(lit).join(',')});`)
    }
    if (partial.campIds.length > 0) {
      runSql(`delete from campos where id in (${partial.campIds.map(lit).join(',')});`)
    }
    throw err
  }
}

/** O que o teardown precisa de facto — permite reconstruir a partir de um
 * manifest gravado em disco (ex. tests/e2e/global-teardown.ts) sem ter de
 * transportar `clients` (sessões vivas) entre processos. */
export type FixtureTeardownInput = Pick<CreatedFixtures, 'camps' | 'userIds'>

/**
 * Apaga só os IDs que esta suite criou (nunca por padrão de nome — isso
 * podia, em teoria, apanhar dados reais). Confirma sempre por leitura que
 * ficaram mesmo apagados; se sobrar alguma coisa, falha explicitamente com
 * exatamente o que sobrou, em vez de terminar em silêncio.
 */
export async function teardownFixtures(created: FixtureTeardownInput): Promise<void> {
  const userIdList = Object.values(created.userIds)
  const campIdList = Object.values(created.camps)

  if (userIdList.length > 0) {
    runSql(`delete from auth.users where id in (${userIdList.map(lit).join(',')});`)
  }
  if (campIdList.length > 0) {
    runSql(`delete from campos where id in (${campIdList.map(lit).join(',')});`)
  }

  const remaining = runSql(`
    select 'user' as kind, id::text as id from auth.users where id in (${
      userIdList.length > 0 ? userIdList.map(lit).join(',') : 'null'
    })
    union all
    select 'camp', id::text from campos where id in (${
      campIdList.length > 0 ? campIdList.map(lit).join(',') : 'null'
    });
  `)

  if (remaining.length > 0) {
    throw new Error(
      `teardownFixtures: ${remaining.length} fixture(s) NÃO foram apagadas — ` +
        `intervenção manual necessária (nunca apagadas por padrão de nome, só pelos IDs exatos abaixo): ` +
        JSON.stringify(remaining)
    )
  }
}

/**
 * Rede de segurança independente do teardown de uma corrida específica:
 * procura fixtures `[TEST]`/`.invalid` cujo padrão de nome/email é
 * inequivocamente de teste (nunca corresponde a um campo ou email reais) e
 * reporta o que encontrar — não apaga nada silenciosamente por si só; quem
 * chama decide se limpa. Útil para detetar/confirmar que uma corrida não
 * deixou nada para trás, sem depender só do que essa corrida "pensa" que
 * criou.
 */
export function findOrphanedTestFixtures(): { camps: SqlRow[]; users: SqlRow[] } {
  const camps = runSql(`select id::text, nome from campos where nome like '[TEST] Camp %';`)
  const users = runSql(`select id::text, email from auth.users where email like 'zz-test-%@camtil.invalid';`)
  return { camps, users }
}

export function sweepOrphanedTestFixtures(): { campsRemoved: number; usersRemoved: number } {
  const { camps, users } = findOrphanedTestFixtures()
  if (users.length > 0) {
    runSql(`delete from auth.users where email like 'zz-test-%@camtil.invalid';`)
  }
  if (camps.length > 0) {
    runSql(`delete from campos where nome like '[TEST] Camp %';`)
  }
  return { campsRemoved: camps.length, usersRemoved: users.length }
}
