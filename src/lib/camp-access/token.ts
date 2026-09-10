import { randomBytes, createHash } from 'node:crypto'

/**
 * FASE 2 — Camp Access Links (ver docs/v2/adr/ADR-camp-access-links.md).
 *
 * Token gerado SEMPRE no servidor (nunca no browser). 32 bytes aleatórios
 * (256 bits) codificados em base64url — nunca persistido em claro, só o
 * hash SHA-256 (`token_hash`, coluna `camp_access_links`). O texto original
 * só existe no momento da geração (mostrado uma vez ao staff) e no pedido
 * de bootstrap (`GET /a/<token>`, nunca logado).
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildAccessLinkUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/a/${token}`
}
