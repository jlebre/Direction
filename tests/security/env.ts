/**
 * FASE 2.1 — Ambiente de teste seguro.
 *
 * Regra inegociável: os testes de segurança/RLS que criam sessões, inserem,
 * atualizam ou apagam dados NUNCA podem correr contra a base de dados de
 * produção (a mesma de NEXT_PUBLIC_SUPABASE_URL em .env.local).
 *
 * Este projeto não tem, à data desta fase, nenhuma das duas formas seguras de
 * testar pedidas no plano de execução:
 *   - Supabase local via CLI/Docker — Docker não está instalado neste ambiente
 *     (`docker --version` -> command not found).
 *   - Um projeto Supabase de Development dedicado — não existe; só há
 *     NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, que são de produção.
 *
 * Por isso, os testes que precisam de escrever dados ou criar sessões reais
 * ficam desenhados por completo (a matriz pedida existe, ver rls-matrix.test.ts)
 * mas SKIP automaticamente enquanto TEST_SUPABASE_URL não estiver configurado
 * — nunca correm "à sorte" contra produção. Ver o relatório da Fase 2 para as
 * duas formas de desbloquear isto.
 *
 * Os testes de tests/security/anon-read-baseline.test.ts são a exceção
 * deliberada: são só leitura (SELECT), nunca escrevem, e documentam o estado
 * de segurança atual (conhecido, já confirmado pela auditoria) como evidência
 * automatizada e repetível — não têm o mesmo risco que os testes de escrita.
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '..', '..')

function readEnvLocalValue(key: string): string | undefined {
  const envPath = path.join(REPO_ROOT, '.env.local')
  if (!existsSync(envPath)) return undefined
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq).trim() === key) {
      let v = trimmed.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      return v
    }
  }
  return undefined
}

function hostnameOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export const PRODUCTION_URL = readEnvLocalValue('NEXT_PUBLIC_SUPABASE_URL')
export const PRODUCTION_ANON_KEY = readEnvLocalValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const PRODUCTION_HOSTNAME = hostnameOf(PRODUCTION_URL)

export interface TestSupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey: string | undefined
}

/**
 * Devolve a configuração de um ambiente de teste SEGURO (local ou Development
 * dedicado), ou `null` se não estiver configurado. Recusa-se explicitamente a
 * devolver uma configuração cujo hostname coincida com o de produção — é a
 * última linha de defesa contra correr o lote de escrita por engano contra
 * dados reais, mesmo que alguém configure TEST_SUPABASE_URL incorretamente.
 */
export function getTestSupabaseConfig(): TestSupabaseConfig | null {
  const url = process.env.TEST_SUPABASE_URL
  const anonKey = process.env.TEST_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const testHostname = hostnameOf(url)
  if (testHostname && PRODUCTION_HOSTNAME && testHostname === PRODUCTION_HOSTNAME) {
    throw new Error(
      `TEST_SUPABASE_URL aponta para o MESMO projeto que NEXT_PUBLIC_SUPABASE_URL ` +
        `(${testHostname}). Isto pareceria "configurado" mas executaria o lote de escrita ` +
        `contra produção — recusado propositadamente. Usa Supabase local (supabase start) ou ` +
        `um segundo projeto Supabase dedicado a testes.`
    )
  }

  return { url, anonKey, serviceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY }
}

export const TEST_ENV = getTestSupabaseConfig()
export const hasSafeTestEnv = TEST_ENV !== null

export const SKIP_REASON =
  'Sem ambiente de teste seguro configurado (TEST_SUPABASE_URL/TEST_SUPABASE_ANON_KEY). ' +
  'Ver docs/v2 e o relatório da Fase 2 — Manual Steps Required — para as opções de desbloqueio ' +
  '(Supabase local via Docker, ou um segundo projeto Supabase de Development).'
