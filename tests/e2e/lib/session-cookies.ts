/**
 * FASE 2 (E2E) — injeta uma sessão Supabase real (obtida por
 * `signInWithPassword` num script Node, nunca no browser) como cookies no
 * formato exato que `@supabase/ssr` espera, para que `createSessionServerClient()`
 * (Server Actions) reconheça o utilizador de teste sem passar por OTP manual.
 *
 * Replica deliberadamente (não importa de `@supabase/ssr/dist/...`, que é
 * interno e pode mudar) a lógica de `createChunks`/`stringToBase64URL` da
 * própria livraria: nome do cookie `sb-<project-ref>-auth-token`, valor
 * prefixado com `base64-` + base64url(JSON.stringify(session)), dividido em
 * `<nome>.0`, `<nome>.1`, ... sempre que `encodeURIComponent(valor)` exceder
 * 3180 caracteres (o mesmo limite usado por `@supabase/ssr`).
 *
 * Nunca usa `service_role`; a sessão vem de `signInWithPassword` com a chave
 * anon (tests/security/fixtures.ts), exatamente como um utilizador real.
 */
import type { Session } from '@supabase/supabase-js'

const MAX_CHUNK_SIZE = 3180

export function projectRefFromUrl(supabaseUrl: string): string {
  const host = new URL(supabaseUrl).hostname
  const ref = host.split('.')[0]
  if (!ref) throw new Error(`Não foi possível extrair o project ref de ${supabaseUrl}`)
  return ref
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function chunkValue(name: string, value: string): { name: string; value: string }[] {
  const encoded = encodeURIComponent(value)
  if (encoded.length <= MAX_CHUNK_SIZE) return [{ name, value }]

  const chunks: string[] = []
  let remaining = encoded
  while (remaining.length > 0) {
    let head = remaining.slice(0, MAX_CHUNK_SIZE)
    const lastEscape = head.lastIndexOf('%')
    if (lastEscape > MAX_CHUNK_SIZE - 3) head = head.slice(0, lastEscape)
    let decodedHead = ''
    while (head.length > 0) {
      try {
        decodedHead = decodeURIComponent(head)
        break
      } catch {
        head = head.slice(0, -3)
      }
    }
    chunks.push(decodedHead)
    remaining = remaining.slice(encodeURIComponent(decodedHead).length)
  }
  return chunks.map((v, i) => ({ name: `${name}.${i}`, value: v }))
}

export interface AuthCookie {
  name: string
  value: string
  domain: string
  path: string
  httpOnly: false
  secure: boolean
  sameSite: 'Lax'
  expires: number
}

/**
 * Constrói os cookies (já eventualmente fragmentados) para uma sessão, prontos
 * para `browserContext.addCookies()`. `domain` deve ser o hostname da app
 * (ex. "direction-camtil.vercel.app"), sem protocolo.
 */
export function buildAuthCookies(session: Session, supabaseUrl: string, domain: string): AuthCookie[] {
  const ref = projectRefFromUrl(supabaseUrl)
  const cookieName = `sb-${ref}-auth-token`
  const payload = 'base64-' + toBase64Url(JSON.stringify(session))
  const secure = !domain.includes('localhost')
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 dias — só para a duração da suite

  return chunkValue(cookieName, payload).map(({ name, value }) => ({
    name,
    value,
    domain,
    path: '/',
    httpOnly: false as const,
    secure,
    sameSite: 'Lax' as const,
    expires,
  }))
}
