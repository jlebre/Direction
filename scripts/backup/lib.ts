/**
 * Fase 0.5 — utilitários do script de backup integral.
 *
 * Corre em Node (via `npx tsx scripts/backup/run-backup.ts`), fora do runtime
 * Next.js. Só lê dados (SELECT / Storage list+download) com a chave anon
 * pública — as mesmas permissões que qualquer cliente do browser já tem hoje.
 * Nunca escreve, atualiza, apaga ou move nada na base de dados ou no Storage.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

// ── 1. Variáveis de ambiente ─────────────────────────────────────────────────
// Lidas só de .env.local, manualmente (sem dependência extra de `dotenv`).
// Propositadamente só lemos as duas chaves públicas necessárias para consultar
// a BD como qualquer cliente da app — nunca ADMIN_PIN, nunca uma service role
// (que este projeto nem sequer usa — ver auditoria, Secção 5).
export function loadEnvLocal(repoRoot: string): void {
  const envPath = path.join(repoRoot, '.env.local')
  if (!existsSync(envPath)) {
    throw new Error(`.env.local não encontrado em ${envPath}`)
  }
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta em .env.local'
    )
  }
  return createClient(url, anonKey)
}

/** Só o hostname do projeto Supabase — não é secreto (é NEXT_PUBLIC_*), mas
 *  mesmo assim não guardamos a chave anon em lado nenhum do output do backup. */
export function getDatabaseLabel(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  try {
    return new URL(url).hostname
  } catch {
    return 'unknown'
  }
}

// ── 2. Paginação genérica ────────────────────────────────────────────────────
// Supabase/PostgREST devolve no máximo 1000 linhas por pedido por omissão.
// Paginamos sempre, mesmo em tabelas pequenas, para nunca truncar em silêncio.
export async function fetchAllRows<T = Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Falha a ler '${table}': ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...(data as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

/** Contagem exata reportada pelo Postgres via `count: 'exact', head: true` —
 *  usada só para validação cruzada contra o número de linhas efetivamente
 *  descarregadas por `fetchAllRows`. */
export async function countRows(client: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`Falha a contar '${table}': ${error.message}`)
  return count ?? 0
}

// ── 3. Storage: listagem recursiva ───────────────────────────────────────────
export interface StorageObjectInfo {
  path: string
  size: number
  updatedAt: string | null
}

export async function listAllStorageObjects(
  client: SupabaseClient,
  bucket: string,
  prefix = ''
): Promise<StorageObjectInfo[]> {
  const out: StorageObjectInfo[] = []
  const { data, error } = await client.storage
    .from(bucket)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  if (error) throw new Error(`Falha a listar bucket '${bucket}' (prefix '${prefix}'): ${error.message}`)
  for (const entry of data ?? []) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name
    // Pastas aparecem como entradas sem id/metadata — recursão.
    if (entry.id === null) {
      const nested = await listAllStorageObjects(client, bucket, fullPath)
      out.push(...nested)
    } else {
      out.push({
        path: fullPath,
        size: (entry.metadata as { size?: number } | null)?.size ?? 0,
        updatedAt: entry.updated_at ?? entry.created_at ?? null,
      })
    }
  }
  return out
}

// ── 4. Checksums ─────────────────────────────────────────────────────────────
export function sha256OfBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

export function sha256OfFile(filePath: string): string {
  return sha256OfBuffer(readFileSync(filePath))
}

// ── 5. Utilitários de nomes (espelham os privados de export-excel/zip.ts) ────
export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
}

export function formatTimestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
