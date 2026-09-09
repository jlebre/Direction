import { describe, it, expect } from 'vitest'
import { sha256OfBuffer, sanitizeFilename } from '../../scripts/backup/lib'

describe('sha256OfBuffer', () => {
  it('é determinístico, tem 64 hex chars, e distingue inputs diferentes', () => {
    const a = sha256OfBuffer(Buffer.from('CAMTIL'))
    const b = sha256OfBuffer(Buffer.from('CAMTIL'))
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256OfBuffer(Buffer.from('outro valor'))).not.toBe(a)
  })
  it('confere com o SHA-256 conhecido de "CAMTIL" (vetor de teste calculado com sha256sum, independente da função)', () => {
    expect(sha256OfBuffer(Buffer.from('CAMTIL'))).toBe(
      'a5ae617957628d7c2027ff4a8eefa2e7a14d6812c0ebb61db78d6667286c6343'
    )
  })
})

describe('sanitizeFilename', () => {
  it('remove acentos e caracteres inválidos, mantendo legível', () => {
    expect(sanitizeFilename('Aranhiços I')).toBe('Aranhicos_I')
    expect(sanitizeFilename('Melgas   III')).toBe('Melgas_III')
  })
})
