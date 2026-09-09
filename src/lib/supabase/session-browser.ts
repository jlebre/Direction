import { createBrowserClient } from '@supabase/ssr'

/**
 * FASE 2.2 (V2 Security & Auth) — cliente Supabase com sessão, para Client
 * Components. Companheiro de `session-server.ts`. Não usado ainda por
 * nenhum código legacy — só por `/login` e futuras páginas protegidas.
 */
export function createSessionBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
