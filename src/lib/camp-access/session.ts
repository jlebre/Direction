import { cookies } from 'next/headers'

/**
 * FASE 2 — Camp Access Links: cookie da sessão de capacidade (secção 8 do
 * pedido). Guarda só o `link_id` (UUID aleatório, 122 bits) — NUNCA o token
 * em claro do bootstrap. O `camp_id` nunca vem do cliente: é sempre
 * resolvido no servidor a partir do `link_id`, revalidado a cada pedido
 * contra `camp_access_links` (ver camp_access_camp_id() na migration 045) —
 * revogar/expirar o link invalida a sessão de imediato, sem esperar o
 * cookie expirar sozinho.
 */
const COOKIE_NAME = 'camtil_camp_access'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 dias — a validade real vem sempre da BD, não do cookie

export async function setCampAccessCookie(linkId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, linkId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export async function clearCampAccessCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCampAccessLinkIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}
