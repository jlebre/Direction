// Fatores de quantidade por escalão × tipo de produto.
// Fonte: supabase/seed_escalao_fatores.sql — mantidos em sync manualmente.
// Melgas = 1.00 para todos os tipos (referência base).
//
// Bandas da DB (receita_ingredientes):
//   quantidade_mosquitos  → representa o escalão "mosquitos"
//   quantidade_aranh_melgas → representa "melgas" (fator 1.00, referência)
//   quantidade_cam_trem    → representa "camaleoes" / "tremelgas" (mesmo fator)

export type TipoProduto = 'massa' | 'arroz' | 'carne' | 'atum' | 'pao' | 'sopa' | 'bolachas' | 'outro'
export type EscalaoFator = 'mosquitos' | 'aranhicos' | 'melgas' | 'tremelgas' | 'camaleoes' | 'animadores'

export const FATORES: Record<EscalaoFator, Record<TipoProduto, number>> = {
  mosquitos:  { massa: 0.40, arroz: 0.36, carne: 0.70, atum: 0.31, pao: 0.77, sopa: 0.70, bolachas: 0.65, outro: 1.00 },
  aranhicos:  { massa: 0.55, arroz: 0.52, carne: 1.00, atum: 1.00, pao: 0.77, sopa: 0.70, bolachas: 0.65, outro: 1.00 },
  melgas:     { massa: 1.00, arroz: 1.00, carne: 1.00, atum: 1.00, pao: 1.00, sopa: 1.00, bolachas: 1.00, outro: 1.00 },
  tremelgas:  { massa: 1.30, arroz: 1.16, carne: 1.30, atum: 1.00, pao: 1.00, sopa: 1.30, bolachas: 1.00, outro: 1.00 },
  camaleoes:  { massa: 1.30, arroz: 1.16, carne: 1.30, atum: 1.00, pao: 1.00, sopa: 1.30, bolachas: 1.00, outro: 1.00 },
  animadores: { massa: 1.30, arroz: 1.16, carne: 1.30, atum: 1.00, pao: 1.00, sopa: 1.30, bolachas: 1.00, outro: 1.00 },
}

/**
 * Dado um quantidade de referência e o escalão a que pertence, calcula os
 * valores para as 3 bandas da DB (mosquitos, aranh_melgas, cam_trem).
 *
 * Fórmula: banda = qtdRef × (fator_banda / fator_ref)
 * Se o tipo não tiver fator para o escalão de referência, usa 1.00 como fallback.
 */
export function calcularBandas(
  qtdRef: number,
  escalaoRef: EscalaoFator,
  tipoProduto: TipoProduto,
): { mosquitos: number; aranh_melgas: number; cam_trem: number; fallback: boolean } {
  const fatorRef = FATORES[escalaoRef]?.[tipoProduto] ?? 1.00
  const fallback = fatorRef === 1.00 && tipoProduto === 'outro'

  const f = (escalao: EscalaoFator) => FATORES[escalao][tipoProduto] / fatorRef

  return {
    mosquitos:   round2(qtdRef * f('mosquitos')),
    aranh_melgas: round2(qtdRef * f('melgas')),
    cam_trem:    round2(qtdRef * f('camaleoes')),
    fallback,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
