import { describe, it, expect } from 'vitest'

// ─── Utility helpers usate nel progetto ───────────────────────────────────
// Questi test verificano le funzioni pure di utility.
// Aggiungi import reali man mano che espandi la copertura.

describe('String utilities', () => {
  it('converte prima lettera in maiuscolo', () => {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    expect(capitalize('ciao')).toBe('Ciao')
    expect(capitalize('')).toBe('')
  })

  it('troncamento testo lungo', () => {
    const truncate = (text: string, max: number) =>
      text.length > max ? text.slice(0, max) + '...' : text
    expect(truncate('Librolo è un progetto fantastico', 10)).toBe('Librolo è ...')
    expect(truncate('Corto', 10)).toBe('Corto')
  })
})

describe('Slug generation', () => {
  it('genera slug da titolo', () => {
    const toSlug = (title: string) =>
      title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    expect(toSlug('Il mio primo capitolo')).toBe('il-mio-primo-capitolo')
    expect(toSlug('Titolo con Numeri 123')).toBe('titolo-con-numeri-123')
  })
})

describe('Validation helpers', () => {
  it('validazione email base', () => {
    const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    expect(isEmail('user@example.com')).toBe(true)
    expect(isEmail('not-an-email')).toBe(false)
    expect(isEmail('')).toBe(false)
  })

  it('controlla che la password sia almeno 8 caratteri', () => {
    const isStrongPassword = (pwd: string) => pwd.length >= 8
    expect(isStrongPassword('secret12')).toBe(true)
    expect(isStrongPassword('short')).toBe(false)
  })
})
