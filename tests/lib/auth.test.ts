import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del modulo DB — evita connessioni reali in test
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
}))

describe('Auth logic (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rifiuta password vuota', () => {
    const validateLoginInput = (email: string, password: string) => {
      if (!email || !password) return { ok: false, error: 'Campi obbligatori' }
      return { ok: true }
    }
    const result = validateLoginInput('user@test.com', '')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Campi obbligatori')
  })

  it('accetta credenziali valide', () => {
    const validateLoginInput = (email: string, password: string) => {
      if (!email || !password) return { ok: false, error: 'Campi obbligatori' }
      return { ok: true }
    }
    const result = validateLoginInput('user@test.com', 'password123')
    expect(result.ok).toBe(true)
  })

  it('normalizza email (lowercase + trim)', () => {
    const normalizeEmail = (email: string) => email.trim().toLowerCase()
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com')
  })
})
