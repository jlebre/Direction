'use server'

/**
 * FASE 2.6 (Server Trust Boundary) — primeiro incremento: só `despesas`
 * (+ linhas). Ver docs/v2/MIGRATION_STRATEGY.md — isto passou de "boa
 * prática" a pré-requisito real depois da subfase 2.4: os componentes
 * cliente (`NovaDespesaClient.tsx` etc.) usavam `@/lib/supabase/client`,
 * uma instância SEM sessão (nunca carrega o cookie de /login, mesmo que o
 * utilizador esteja autenticado no mesmo browser) — por isso qualquer
 * escrita chegava à BD sempre como `anon`. Sem isto, fechar a RLS de um
 * campo (retirar o `legacy_anon_access`) bloquearia mesmo um adjunto real
 * já autenticado.
 *
 * Storage (upload/remoção de fotos) continua do lado do cliente, sem
 * alteração — decisão explícita da subfase 2.5 (bucket público mantido
 * por agora). Só as escritas na BD passam a vir de aqui.
 *
 * Validação com Zod: nunca confiar em tipos TypeScript como validação de
 * runtime — um payload malformado é rejeitado aqui, com uma mensagem
 * clara, antes de chegar à RLS.
 */
import { z } from 'zod'
import { createSessionServerClient } from '@/lib/supabase/session-server'
import { revalidatePath } from 'next/cache'
import { resolveActor, actorCanAccessCamp } from '@/lib/auth/actor'

const linhaSchema = z.object({
  texto_linha_original: z.string(),
  nome_produto_bruto: z.string(),
  quantidade: z.number().nullable(),
  unidade: z.string().nullable(),
  preco_unitario: z.number().nullable(),
  preco_total: z.number().nullable(),
  confianca: z.string().nullable().optional(),
  estado: z.string().optional(),
  tipo_linha: z.string().nullable().optional(),
  categoria_linha: z.string().nullable().optional(),
})

const createDespesaSchema = z.object({
  campoId: z.string().uuid(),
  data: z.string().min(1),
  valor: z.number(),
  descricao: z.string().nullable(),
  codigo: z.string().min(1),
  codigoDescricao: z.string().min(1),
  nifConfirmado: z.boolean(),
  fotoPath: z.string().nullable(),
  ocrStatus: z.enum(['nenhum', 'processado', 'falhou']),
  ocrTexto: z.string().nullable(),
  ocrFornecedor: z.string().nullable(),
  ocrTotal: z.number().nullable(),
  ocrData: z.string().nullable(),
  origemDados: z.enum(['manual', 'ocr', 'qr_code']).nullable(),
  nifVisivel: z.boolean().nullable(),
  qrRaw: z.string().nullable(),
  qrTotal: z.number().nullable(),
  qrData: z.string().nullable(),
  qrNifEmitente: z.string().nullable(),
  qrNifAdquirente: z.string().nullable(),
  qrNumeroDocumento: z.string().nullable(),
  qrAtcud: z.string().nullable(),
  qrTipoDocumento: z.string().nullable(),
  linhas: z.array(linhaSchema).default([]),
})

export type CreateDespesaInput = z.input<typeof createDespesaSchema>

export interface CreateDespesaResult {
  error?: string
  despesaId?: string
  numeroRecibo?: number
}

/**
 * Cria uma despesa + linhas de produto. Mantém o mesmo padrão de retry em
 * caso de conflito de numero_recibo (único por campo, migration 016) que
 * já existia no cliente — só movido para o servidor. Uma RPC atómica
 * (evitar por completo o read→calculate→write) fica como melhoria futura,
 * não incluída neste incremento.
 */
export async function createDespesa(input: CreateDespesaInput): Promise<CreateDespesaResult> {
  const parsed = createDespesaSchema.safeParse(input)
  if (!parsed.success) {
    return { error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join('; ')}` }
  }
  const d = parsed.data

  // FASE 2 (Camp Access Links) — uma sessão de camp_access nunca escreve
  // via RLS normal (não tem auth.uid()); passa sempre pela RPC
  // SECURITY DEFINER dedicada, que revalida o link internamente. Staff e
  // anon-legacy continuam exactamente no caminho de sempre, abaixo.
  const actor = await resolveActor()
  if (actor.actorType === 'camp_access') {
    if (!actorCanAccessCamp(actor, d.campoId)) return { error: 'Sem permissão para este campo.' }
    const { data, error } = await actor.supabase.rpc('camp_access_create_despesa', {
      p_link_id: actor.linkId,
      p_payload: d,
    })
    if (error || !data || data.length === 0) return { error: error?.message ?? 'Não foi possível registar a despesa.' }
    const row = data[0] as { despesa_id: string; numero_recibo: number }
    // despesa_linhas (linhas de produto OCR) fica fora do âmbito desta
    // primeira ligação de Camp Access Links — o fluxo manual do Adjunto
    // não as usa; só o pipeline de IA (ainda não construído) as gera.
    revalidatePath(`/campo/${d.campoId}/adjuntos`)
    return { despesaId: row.despesa_id, numeroRecibo: row.numero_recibo }
  }

  const supabase = await createSessionServerClient()

  let despesaId: string | null = null
  let numeroRecibo = 0
  let lastErrorMessage = 'Não foi possível registar a despesa.'

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: last } = await supabase
      .from('despesas')
      .select('numero_recibo')
      .eq('campo_id', d.campoId)
      .order('numero_recibo', { ascending: false })
      .limit(1)
      .maybeSingle()
    numeroRecibo = (last?.numero_recibo ?? 0) + 1

    const { data, error } = await supabase
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
        nif_confirmado: d.nifConfirmado,
        foto_path: d.fotoPath,
        ocr_status: d.ocrStatus,
        ocr_texto: d.ocrTexto,
        ocr_fornecedor: d.ocrFornecedor,
        ocr_total: d.ocrTotal,
        ocr_data: d.ocrData,
        origem_dados: d.origemDados,
        nif_visivel: d.nifVisivel,
        qr_raw: d.qrRaw,
        qr_total: d.qrTotal,
        qr_data: d.qrData,
        qr_nif_emitente: d.qrNifEmitente,
        qr_nif_adquirente: d.qrNifAdquirente,
        qr_numero_documento: d.qrNumeroDocumento,
        qr_atcud: d.qrAtcud,
        qr_tipo_documento: d.qrTipoDocumento,
      })
      .select('id')
      .single()

    if (!error && data) {
      despesaId = data.id as string
      break
    }
    lastErrorMessage = error?.message ?? lastErrorMessage
    if (error?.code !== '23505' || attempt === 2) break
    await new Promise((r) => setTimeout(r, 100 * (attempt + 1)))
  }

  if (!despesaId) {
    // Mensagem genérica de propósito quando a causa é RLS (sem posse do
    // campo) — não distinguir "campo não existe" de "sem permissão".
    return { error: lastErrorMessage }
  }

  const linhasParaInserir = d.linhas
    .filter((l) => l.preco_total !== null && l.tipo_linha === 'produto')
    .map((l) => ({ ...l, despesa_id: despesaId }))
  if (linhasParaInserir.length > 0) {
    await supabase.from('despesa_linhas').insert(linhasParaInserir)
  }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  return { despesaId, numeroRecibo }
}

const updateDespesaSchema = z.object({
  despesaId: z.string().uuid(),
  campoId: z.string().uuid(),
  valor: z.number(),
  descricao: z.string().nullable(),
  data: z.string().min(1),
  codigo: z.string().min(1),
  codigoDescricao: z.string().min(1),
  nifConfirmado: z.boolean(),
  fotoPath: z.string().nullable(),
})

export type UpdateDespesaInput = z.input<typeof updateDespesaSchema>

export async function updateDespesa(input: UpdateDespesaInput): Promise<{ error?: string }> {
  const parsed = updateDespesaSchema.safeParse(input)
  if (!parsed.success) {
    return { error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join('; ')}` }
  }
  const d = parsed.data

  const actor = await resolveActor()
  if (actor.actorType === 'camp_access') {
    if (!actorCanAccessCamp(actor, d.campoId)) return { error: 'Sem permissão para este campo.' }
    const { error } = await actor.supabase.rpc('camp_access_update_despesa', {
      p_link_id: actor.linkId,
      p_despesa_id: d.despesaId,
      p_payload: d,
    })
    if (error) return { error: error.message }
    revalidatePath(`/campo/${d.campoId}/adjuntos`)
    revalidatePath(`/campo/${d.campoId}/adjuntos/despesa/${d.despesaId}`)
    return {}
  }

  const supabase = await createSessionServerClient()

  const { error } = await supabase
    .from('despesas')
    .update({
      valor: d.valor,
      descricao: d.descricao,
      data: d.data,
      codigo: d.codigo,
      codigo_descricao: d.codigoDescricao,
      nif_confirmado: d.nifConfirmado,
      foto_path: d.fotoPath,
    })
    .eq('id', d.despesaId)

  if (error) return { error: error.message }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  revalidatePath(`/campo/${d.campoId}/adjuntos/despesa/${d.despesaId}`)
  return {}
}

const deleteDespesaSchema = z.object({
  despesaId: z.string().uuid(),
  campoId: z.string().uuid(),
})

export async function deleteDespesa(input: z.input<typeof deleteDespesaSchema>): Promise<{ error?: string }> {
  const parsed = deleteDespesaSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const d = parsed.data

  const actor = await resolveActor()
  if (actor.actorType === 'camp_access') {
    if (!actorCanAccessCamp(actor, d.campoId)) return { error: 'Sem permissão para este campo.' }
    const { error } = await actor.supabase.rpc('camp_access_delete_despesa', {
      p_link_id: actor.linkId,
      p_despesa_id: d.despesaId,
    })
    if (error) return { error: error.message }
    revalidatePath(`/campo/${d.campoId}/adjuntos`)
    return {}
  }

  const supabase = await createSessionServerClient()

  const { error } = await supabase.from('despesas').delete().eq('id', d.despesaId)
  if (error) return { error: error.message }

  revalidatePath(`/campo/${d.campoId}/adjuntos`)
  return {}
}
