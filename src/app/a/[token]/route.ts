import { NextResponse, type NextRequest } from 'next/server'
import { createSessionServerClient } from '@/lib/supabase/session-server'
import { hashToken } from '@/lib/camp-access/token'
import { setCampAccessCookie } from '@/lib/camp-access/session'

/**
 * FASE 2 — Camp Access Links: bootstrap (secção 7 do pedido).
 *
 * `GET /a/<token>` — só servidor. Nunca revela se o token é inválido,
 * expirado ou revogado (a mesma página genérica para os três, para nunca
 * confirmar a um atacante "quase acertaste"). O token em claro nunca fica
 * na URL depois deste pedido — o redirect final vai para
 * `/campo/<id>/adjuntos`, sem o token.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createSessionServerClient()

  const tokenHash = hashToken(token)
  const { data, error } = await supabase.rpc('camp_access_bootstrap', { p_token_hash: tokenHash }).maybeSingle()
  const row = data as { link_id: string; camp_id: string } | null

  if (error || !row || !row.camp_id) {
    // Nunca distinguir "não existe" de "expirado" de "revogado" nesta resposta.
    return NextResponse.redirect(new URL('/a/invalido', _request.url))
  }

  await setCampAccessCookie(row.link_id)

  return NextResponse.redirect(new URL(`/campo/${row.camp_id}/adjuntos`, _request.url))
}
