'use server'

/**
 * FASE 2.6 (Server Trust Boundary) — terceiro incremento: regularização de
 * NIF (cria a despesa de regularização + as ligações regularizacoes_nif).
 * Mesmo racional de src/actions/despesas.ts.
 */
import { z } from 'zod'
import { createSessionServerClient } from '@/lib/supabase/session-server'
import { revalidatePath } from 'next/cache'

const allocationSchema = z.object({
  despesaOriginalId: z.string().uuid(),
  valor: z.number().positive(),
})

const createRegularizacaoSchema = z.object({
  campoId: z.string().uuid(),
  data: z.string().min(1),
  valor: z.number(),
  descricao: z.string().nullable(),
  codigo: z.string().min(1),
  codigoDescricao: z.string().min(1),
  fotoPath: z.string().nullable(),
  allocations: z.array(allocationSchema),
})

export type CreateRegularizacaoInput = z.input<typeof createRegularizacaoSchema>

export interface CreateRegularizacaoResult {
  error?: string
  despesaId?: string
  numeroRecibo?: number
}

/**
 * Cria a fatura de regularização (despesas.is_regularizacao_nif=true) e as
 * ligações em regularizacoes_nif. Réplica fiel do fluxo original — inclui
 * a mesma ausência de retry no numero_recibo (uma única tentativa, sem
 * loop) que já existia em RegularizarClient.tsx; não adicionado aqui para
 * não alterar comportamento além da fronteira de confiança.
 */
export async function createRegularizacao(input: CreateRegularizacaoInput): Promise<CreateRegularizacaoResult> {
  const parsed = createRegularizacaoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join('; ')}` }
  }
  const d = parsed.data
  const supabase = await createSessionServerClient()

  const { data: last } = await supabase
    .from('despesas')
    .select('numero_recibo')
    .eq('campo_id', d.campoId)
    .order('numero_recibo', { ascending: false })
    .limit(1)
    .maybeSingle()
  const numeroRecibo = (last?.numero_recibo ?? 0) + 1

  const { data: novaDespesa, error: insertError } = await supabase
    .from('despesas')
    .insert({
      campo_id: d.campoId,
      numero_recibo: numeroRecibo,
      data: d.data,
      valor: d.valor,
      descricao: d.descricao,
      codigo: d.codigo,
      codigo_descricao: d.codigoDescricao,
      tipo: 'despesa',
      nif_confirmado: true,
      is_regularizacao_nif: true,
      foto_path: d.fotoPath,
    })
    .select('id')
    .single()

  if (insertError || !novaDespesa) {
    return { error: insertError?.message ?? 'Despesa de regularização não criada.' }
  }
  const despesaId = novaDespesa.id as string

  if (d.allocations.length > 0) {
    const { error: regError } = await supabase.from('regularizacoes_nif').insert(
      d.allocations.map((a) => ({
        campo_id: d.campoId,
        despesa_regularizacao_id: despesaId,
        despesa_original_id: a.despesaOriginalId,
        valor: a.valor,
      }))
    )
    if (regError) return { error: regError.message }
  }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  revalidatePath(`/campo/${d.campoId}/adjuntos/regularizar`)
  return { despesaId, numeroRecibo }
}
