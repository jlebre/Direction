'use server'

/**
 * FASE 2.6 (Server Trust Boundary) — Danger Zone de SetupForm.tsx.
 *
 * Achado de segurança sinalizado explicitamente pelo utilizador: a Danger
 * Zone apagava despesas/devoluções/regularizações/liquidações direto do
 * cliente, sem transação (4 DELETEs sequenciais, 2 sem verificação de
 * erro), e sem exigir PIN quando o campo não tinha PIN configurado.
 *
 * Resolvido em duas partes:
 *   1. BD — `danger_zone_clear_financials()` (migration 043), uma única
 *      transação, com o mesmo gate de autorização das RLS (nunca mais
 *      restritivo nem mais permissivo do que já era).
 *   2. Aqui — reautentica o PIN no SERVIDOR antes de chamar a RPC (nunca
 *      confia que o cliente já validou), e recusa por completo campos sem
 *      PIN configurado: sem PIN, não há fricção nenhuma para confirmar que
 *      quem está a apagar é quem devia — por isso a Danger Zone fica
 *      indisponível até o campo ter um PIN definido (ver SetupForm.tsx).
 *
 * Storage (fotos) continua a ser removido pelo cliente, depois da
 * transação da BD confirmar — não é transacional com a BD (decisão 2.5,
 * bucket ainda público) mas passa a só acontecer depois do commit real,
 * nunca antes, nunca em paralelo com um DELETE que pode falhar a meio.
 */
import { z } from 'zod'
import { createSessionServerClient } from '@/lib/supabase/session-server'
import { revalidatePath } from 'next/cache'

const clearFinancialsSchema = z.object({
  campoId: z.string().uuid(),
  confirmText: z.literal('APAGAR'),
  pin: z.string().nullable(),
})

export type ClearFinancialsInput = z.input<typeof clearFinancialsSchema>

export interface ClearFinancialsResult {
  error?: string
  countDespesas?: number
  countDevolucoes?: number
  countRegularizacoes?: number
  countLiquidacoes?: number
  fotoPaths?: string[]
}

export async function clearCampFinancials(input: ClearFinancialsInput): Promise<ClearFinancialsResult> {
  const parsed = clearFinancialsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join('; ')}` }
  }
  const d = parsed.data
  const supabase = await createSessionServerClient()

  // Re-valida o campo tem mesmo um PIN configurado e que o PIN recebido
  // está correto — SEMPRE, nunca condicional a "hasPin" vindo do cliente
  // (esse valor já foi lido no servidor ao renderizar a página, mas nunca
  // confiar que o cliente reenviou fielmente essa condição).
  const { data: campo, error: campoError } = await supabase.from('campos').select('pin').eq('id', d.campoId).single()
  if (campoError || !campo) return { error: 'Campo não encontrado.' }
  if (!campo.pin) {
    return { error: 'Este campo não tem PIN configurado — a Danger Zone está desativada até haver um PIN definido.' }
  }
  if (d.pin !== campo.pin) {
    return { error: 'PIN incorreto.' }
  }

  const { data: result, error } = await supabase
    .rpc('danger_zone_clear_financials', { target_camp_id: d.campoId })
    .single()

  if (error) {
    return { error: error.message }
  }
  const r = result as {
    count_despesas: number
    count_devolucoes: number
    count_regularizacoes: number
    count_liquidacoes: number
    foto_paths: string[]
  }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  revalidatePath(`/campo/${d.campoId}/setup`)

  return {
    countDespesas: r.count_despesas,
    countDevolucoes: r.count_devolucoes,
    countRegularizacoes: r.count_regularizacoes,
    countLiquidacoes: r.count_liquidacoes,
    fotoPaths: r.foto_paths ?? [],
  }
}
