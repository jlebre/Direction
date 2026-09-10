import type { SupabaseClient } from '@supabase/supabase-js'

const PREFIXES: Record<string, string> = {
  'Mosquitos I': 'MOSQ1', 'Mosquitos II': 'MOSQ2',
  'Aranhiços I': 'ARAN1', 'Aranhiços II': 'ARAN2', 'Aranhiços III': 'ARAN3',
  'Melgas I': 'MELG1', 'Melgas II': 'MELG2', 'Melgas III': 'MELG3',
  'Tremelgas I': 'TREM1', 'Tremelgas II': 'TREM2',
  'Camaleões': 'CAM',
}

export function getCampoSlug(nome: string): string {
  // Storage do Supabase rejeita chaves com certos caracteres (confirmado:
  // "Invalid key" para `[`/`]`, ex. em nomes de fixtures de teste "[TEST] ...").
  // Nenhum dos 11 campos reais tem nome fora de letras/números/espaços, por
  // isso este passo extra não altera o slug de nenhum campo existente —
  // só passa a sanear nomes fora desse padrão (fixtures de teste incluídas).
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function getPhotoFilename(campoNome: string, numeroRecibo: number): string {
  const prefix = PREFIXES[campoNome] || 'CAMPO'
  return `${prefix}-${String(numeroRecibo).padStart(3, '0')}.jpg`
}

/**
 * Fase 2.8 (Storage isolation) — o bucket `faturas` deixou de ser público
 * (`getPublicUrl` já não serve nada, a policy de SELECT passou a exigir
 * `has_camp_access()`/`has_legacy_anon_access()` do path). Uma signed URL é
 * gerada com as credenciais de quem chama (respeita a RLS no momento em que
 * é assinada — se não tiver acesso, `createSignedUrl` já falha aqui), válida
 * por tempo limitado, só para servir a `<img src>`. A autorização continua a
 * vir das Storage policies, não da signed URL em si.
 */
export async function getSignedPhotoUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from('faturas').createSignedUrl(path, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}
