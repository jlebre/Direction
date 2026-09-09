/**
 * FASE 2.3+ — canal de SQL para gestão de fixtures de teste.
 *
 * Usa deliberadamente `supabase db query --linked` (CLI já autenticado com
 * a conta do projeto) em vez de qualquer `service_role`/connection string
 * direta — nunca precisámos, e nunca vamos precisar, de manusear esse
 * segredo a partir do código. Só usado por testes que criam fixtures
 * `[TEST]`/`.invalid` claramente identificadas (ver fixtures.ts).
 */
import { execFileSync } from 'node:child_process'

export interface SqlRow {
  [key: string]: unknown
}

export function runSql(sql: string): SqlRow[] {
  const raw = execFileSync('npx', ['supabase', 'db', 'query', '--linked'], {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 16,
    // Necessário no Windows: `npx` é um shim .cmd, execFileSync só o
    // encontra através da shell (o mesmo padrão já usado sem problemas
    // em scripts/backup/run-backup.ts, que corre via `npm run backup`,
    // ou seja, já dentro de uma shell).
    shell: true,
  })
  // O CLI imprime uma linha informativa ("Initialising login role...") antes
  // do JSON — encontrar o primeiro '{' e fazer parse a partir daí.
  const start = raw.indexOf('{')
  if (start === -1) {
    throw new Error(`runSql: sem resposta JSON reconhecível. Output bruto:\n${raw}`)
  }
  const parsed = JSON.parse(raw.slice(start))
  if (parsed.error) {
    throw new Error(`runSql error: ${JSON.stringify(parsed.error)}`)
  }
  return parsed.rows ?? []
}
