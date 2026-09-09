import { createClient } from '@supabase/supabase-js'

/**
 * FASE 2 (onboarding real) — cliente com `service_role`.
 *
 * SÓ para a única coisa que exige mesmo privilégio elevado: criar contas
 * Supabase Auth novas ao convidar um utilizador real (`auth.admin.createUser`)
 * — não há forma de o fazer com a chave anon/sessão. Nunca usado para ler ou
 * escrever nas tabelas de negócio (essas continuam sempre a passar por RLS
 * através do cliente de sessão) — isso seria exatamente o "bypass geral de
 * RLS" que o plano da Fase 2 proíbe explicitamente.
 *
 * NUNCA importar este módulo num Client Component. `SUPABASE_SERVICE_ROLE_KEY`
 * (sem prefixo `NEXT_PUBLIC_`) nunca chega ao browser — se estiver ausente,
 * as funções que dependem disto falham com um erro claro, não um crash.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não está configurada neste ambiente. ' +
        'Sem esta variável (nunca NEXT_PUBLIC_), não é possível criar contas novas ' +
        'para pessoas que nunca autenticaram antes — ver docs/v2/OPERATIONS.md.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
