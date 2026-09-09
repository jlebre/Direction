import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * FASE 2.2 (V2 Security & Auth) — cliente Supabase COM sessão real de
 * utilizador (Supabase Auth), para Server Components e Server Actions.
 *
 * Deliberadamente um módulo novo, separado de `src/lib/supabase/server.ts`
 * (que continua a existir, inalterado, e continua a ser usado por todo o
 * código legacy que só precisa da chave anon sem sessão) — zero risco de
 * quebrar nada existente. Só o código novo desta fase (login, futuras rotas
 * protegidas) usa este módulo.
 */
export async function createSessionServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado a partir de um Server Component (não pode escrever
            // cookies fora de uma Server Action/Route Handler) — inofensivo
            // desde que o proxy.ts atualize a sessão nos pedidos seguintes.
          }
        },
      },
    }
  )
}

/**
 * Utilizador autenticado atual, ou `null`. Usa sempre `getUser()` (nunca só
 * `getSession()`) — valida o JWT contra o servidor Auth em vez de confiar
 * cegamente no cookie local. Ver docs/v2/AUTHORIZATION.md.
 */
export async function getCurrentUser() {
  const supabase = await createSessionServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
