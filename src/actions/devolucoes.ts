'use server'

/**
 * FASE 2.6 (Server Trust Boundary) — segundo incremento: devolucoes.
 * Mesmo racional de src/actions/despesas.ts — ver esse ficheiro para o
 * porquê. Storage continua do lado do cliente (decisão da subfase 2.5).
 */
import { z } from 'zod'
import { createSessionServerClient } from '@/lib/supabase/session-server'
import { revalidatePath } from 'next/cache'

const createDevolucaoSchema = z.object({
  campoId: z.string().uuid(),
  data: z.string().min(1),
  valor: z.number(),
  descricao: z.string().nullable(),
  codigo: z.string().nullable(),
  codigoDescricao: z.string().nullable(),
  faturaOriginalId: z.string().uuid().nullable(),
  notas: z.string().nullable(),
})

export type CreateDevolucaoInput = z.input<typeof createDevolucaoSchema>

export interface CreateDevolucaoResult {
  error?: string
  devolucaoId?: string
  numeroDevolucao?: number
}

/**
 * Cria a devolução SEM foto (`foto_path: null`) — o fluxo original faz
 * upload da foto só depois de ter o número confirmado (nome do ficheiro
 * inclui o número), e só então grava o `foto_path` com
 * `attachDevolucaoFoto`. Mantém o mesmo retry de numero_devolucao (único
 * por campo, migration 024) que já existia no cliente — 5 tentativas,
 * como no código original.
 */
export async function createDevolucao(input: CreateDevolucaoInput): Promise<CreateDevolucaoResult> {
  const parsed = createDevolucaoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join('; ')}` }
  }
  const d = parsed.data
  const supabase = await createSessionServerClient()

  let devolucaoId: string | null = null
  let numeroDevolucao = 0
  let lastErrorMessage = 'Não foi possível criar a devolução.'

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: last } = await supabase
      .from('devolucoes')
      .select('numero_devolucao')
      .eq('campo_id', d.campoId)
      .order('numero_devolucao', { ascending: false })
      .limit(1)
      .maybeSingle()
    numeroDevolucao = (last?.numero_devolucao ?? 0) + 1

    const { data, error } = await supabase
      .from('devolucoes')
      .insert({
        campo_id: d.campoId,
        numero_devolucao: numeroDevolucao,
        data: d.data,
        valor: d.valor,
        descricao: d.descricao,
        codigo: d.codigo,
        codigo_descricao: d.codigoDescricao,
        fatura_original_id: d.faturaOriginalId,
        notas: d.notas,
        foto_path: null,
        origem_dados: 'manual',
      })
      .select('id')
      .single()

    if (!error && data) {
      devolucaoId = data.id as string
      break
    }
    lastErrorMessage = error?.message ?? lastErrorMessage
    if (error?.code !== '23505' || attempt === 4) break
  }

  if (!devolucaoId) return { error: lastErrorMessage }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  return { devolucaoId, numeroDevolucao }
}

const attachFotoSchema = z.object({
  devolucaoId: z.string().uuid(),
  campoId: z.string().uuid(),
  fotoPath: z.string(),
})

export async function attachDevolucaoFoto(input: z.input<typeof attachFotoSchema>): Promise<{ error?: string }> {
  const parsed = attachFotoSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const d = parsed.data
  const supabase = await createSessionServerClient()

  const { error } = await supabase.from('devolucoes').update({ foto_path: d.fotoPath }).eq('id', d.devolucaoId)
  if (error) return { error: error.message }
  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  return {}
}

const updateDevolucaoSchema = z.object({
  devolucaoId: z.string().uuid(),
  campoId: z.string().uuid(),
  data: z.string().min(1),
  valor: z.number(),
  descricao: z.string().nullable(),
  codigo: z.string().nullable(),
  codigoDescricao: z.string().nullable(),
  faturaOriginalId: z.string().uuid().nullable(),
  notas: z.string().nullable(),
  fotoPath: z.string().nullable(),
})

export type UpdateDevolucaoInput = z.input<typeof updateDevolucaoSchema>

export async function updateDevolucao(input: UpdateDevolucaoInput): Promise<{ error?: string }> {
  const parsed = updateDevolucaoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join('; ')}` }
  }
  const d = parsed.data
  const supabase = await createSessionServerClient()

  const { error } = await supabase
    .from('devolucoes')
    .update({
      data: d.data,
      valor: d.valor,
      descricao: d.descricao,
      codigo: d.codigo,
      codigo_descricao: d.codigoDescricao,
      fatura_original_id: d.faturaOriginalId,
      notas: d.notas,
      foto_path: d.fotoPath,
    })
    .eq('id', d.devolucaoId)

  if (error) return { error: error.message }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  revalidatePath(`/campo/${d.campoId}/adjuntos/devolucao/${d.devolucaoId}`)
  return {}
}

const deleteDevolucaoSchema = z.object({
  devolucaoId: z.string().uuid(),
  campoId: z.string().uuid(),
})

export async function deleteDevolucao(input: z.input<typeof deleteDevolucaoSchema>): Promise<{ error?: string }> {
  const parsed = deleteDevolucaoSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const d = parsed.data
  const supabase = await createSessionServerClient()

  const { error } = await supabase.from('devolucoes').delete().eq('id', d.devolucaoId)
  if (error) return { error: error.message }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  return {}
}
