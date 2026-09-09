'use server'

/**
 * LEGACY ACCESS (Fase 2 — compatibilidade transitória, ver
 * docs/v2/AUTHORIZATION.md § Fase de compatibilidade).
 *
 * Continua ativo de propósito enquanto os campos reais não tiverem uma
 * membership de `adjunto` real (authenticated access, via Supabase Auth +
 * camp_memberships) — ver /admin/memberships para o estado de migração por
 * campo. Não remover nem estender este mecanismo; é para desaparecer, não
 * para crescer. A RLS restritiva das tabelas financeiras (subfase 2.4) só
 * fecha quando todos os campos ainda ativos estiverem "READY".
 */
import { createClient } from '@/lib/supabase/server'

export async function validatePin(campoId: string, pin: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('campos')
    .select('pin')
    .eq('id', campoId)
    .single()
  return !!data?.pin && data.pin === pin
}
