/**
 * FASE 2.1 — Prova de que a pista "unit" do harness funciona de ponta a
 * ponta, testando helpers puros já existentes em produção (sem os alterar).
 */
import { describe, it, expect } from 'vitest'
import { getCampoSlug, getPhotoFilename } from '@/lib/adjuntos/supabase-storage'

describe('getCampoSlug', () => {
  it('normaliza acentos e espaços (confere com os 11 slugs reais do backup validado da Fase 0.5)', () => {
    expect(getCampoSlug('Aranhiços I')).toBe('aranhicos-i')
    expect(getCampoSlug('Melgas III')).toBe('melgas-iii')
    expect(getCampoSlug('Camaleões')).toBe('camaleoes')
  })
  it('é usado como prefixo de caminho consistente no Storage (contrato de tests/security)', () => {
    const slug = getCampoSlug('Tremelgas II')
    expect(slug).not.toMatch(/\s/)
    expect(slug.toLowerCase()).toBe(slug)
  })
})

describe('getPhotoFilename', () => {
  it('gera nome com prefixo do campo e recibo com padding de 3 dígitos', () => {
    expect(getPhotoFilename('Mosquitos I', 7)).toBe('MOSQ1-007.jpg')
  })
  it('usa prefixo genérico para campos desconhecidos', () => {
    expect(getPhotoFilename('Campo Novo', 1)).toBe('CAMPO-001.jpg')
  })
})
