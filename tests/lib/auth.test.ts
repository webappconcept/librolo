import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock DB -- evita connessioni reali in test
// La chain drizzle deve supportare sia .where() terminale (senza .limit)
// sia .where().limit() terminale
// ---------------------------------------------------------------------------
const mockDbFactory = () => {
  const terminal = vi.fn().mockResolvedValue([])
  const chain: Record<string, unknown> = {}
  chain.limit     = terminal
  chain.orderBy   = vi.fn(() => ({ limit: terminal }))
  chain.where     = Object.assign(vi.fn().mockResolvedValue([]), { limit: terminal })
  chain.innerJoin = vi.fn(() => chain)
  chain.from      = vi.fn(() => chain)
  return chain
}

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(() => mockDbFactory()),
    insert: vi.fn().mockReturnThis(),
    values:  vi.fn().mockResolvedValue([]),
    delete:  vi.fn().mockReturnThis(),
    update:  vi.fn().mockResolvedValue([]),
  },
}))

// ---------------------------------------------------------------------------
// Mock next/headers (session.ts usa cookies())
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get:    vi.fn().mockReturnValue({ value: 'mock-session-token' }),
    set:    vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockReturnValue(new Headers()),
}))

// ---------------------------------------------------------------------------
// SECTION 1: session.ts -- hashPassword, comparePasswords, signToken, verifyToken
// ---------------------------------------------------------------------------
describe('session.ts', () => {
  let hashPassword:    (p: string) => Promise<string>
  let comparePasswords:(plain: string, hashed: string) => Promise<boolean>
  let signToken:       (payload: { user: { id: number; role: string }; expires: string }) => Promise<string>
  let verifyToken:     (token: string) => Promise<{ user: { id: number; role: string }; expires: string }>

  beforeEach(async () => {
    process.env.AUTH_SECRET = 'test-secret-key-at-least-32-chars-long-!'
    const mod       = await import('@/lib/auth/session')
    hashPassword    = mod.hashPassword
    comparePasswords = mod.comparePasswords
    signToken       = mod.signToken
    verifyToken     = mod.verifyToken
  })

  describe('hashPassword / comparePasswords', () => {
    it('produce un hash diverso dalla password originale', async () => {
      const hashed = await hashPassword('MySecurePass123!')
      expect(hashed).not.toBe('MySecurePass123!')
      expect(hashed.startsWith('$2b$')).toBe(true)
    })

    it('due hash della stessa password sono diversi (salt)', async () => {
      const ha1 = await hashPassword('password')
      const ha2 = await hashPassword('password')
      expect(ha1).not.toBe(ha2)
    })

    it('comparePasswords ritorna true per password corretta', async () => {
      const hashed = await hashPassword('correct-horse-battery')
      const result = await comparePasswords('correct-horse-battery', hashed)
      expect(result).toBe(true)
    })

    it('comparePasswords ritorna false per password sbagliata', async () => {
      const hashed = await hashPassword('correct-password')
      const result = await comparePasswords('wrong-password', hashed)
      expect(result).toBe(false)
    })
  })

  describe('signToken / verifyToken', () => {
    it('signa e verifica un token valido', async () => {
      const payload = {
        user:    { id: 42, role: 'member' },
        expires: new Date(Date.now() + 86400 * 1000).toISOString(),
      }
      const token = await signToken(payload)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)

      const decoded = await verifyToken(token)
      expect(decoded.user.id).toBe(42)
      expect(decoded.user.role).toBe('member')
    })

    it('verifyToken fallisce su token malformato', async () => {
      await expect(verifyToken('token.not.valid')).rejects.toThrow()
    })

    it('verifyToken fallisce su stringa vuota', async () => {
      await expect(verifyToken('')).rejects.toThrow()
    })
  })
})

// ---------------------------------------------------------------------------
// SECTION 2: otp.ts -- generateOtpCode, verifyOtpCode
// ---------------------------------------------------------------------------
describe('otp.ts', () => {
  let generateOtpCode: () => string

  beforeEach(async () => {
    const mod      = await import('@/lib/auth/otp')
    generateOtpCode = mod.generateOtpCode
  })

  describe('generateOtpCode', () => {
    it('genera un codice di esattamente 6 cifre', () => {
      const code = generateOtpCode()
      expect(code).toMatch(/^\d{6}$/)
    })

    it('genera codici diversi ad ogni chiamata', () => {
      const codes = new Set(Array.from({ length: 10 }, () => generateOtpCode()))
      expect(codes.size).toBeGreaterThan(1)
    })

    it('il codice e sempre compreso tra 100000 e 999999', () => {
      for (let i = 0; i < 20; i++) {
        const num = parseInt(generateOtpCode(), 10)
        expect(num).toBeGreaterThanOrEqual(100000)
        expect(num).toBeLessThanOrEqual(999999)
      }
    })
  })

  describe('verifyOtpCode -- logica dominio (mock DB)', () => {
    it('rifiuta se nessun record trovato (codice non esiste)', async () => {
      const { verifyOtpCode } = await import('@/lib/auth/otp')
      const result = await verifyOtpCode(1, '123456')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Codice non trovato.')
    })
  })
})

// ---------------------------------------------------------------------------
// SECTION 3: password-reset.ts -- verifyPasswordResetToken
// ---------------------------------------------------------------------------
describe('password-reset.ts', () => {
  it('rifiuta token inesistente (DB ritorna [])', async () => {
    const { verifyPasswordResetToken } = await import('@/lib/auth/password-reset')
    const result = await verifyPasswordResetToken('nonexistent-token')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('Link non valido.')
  })

  it('rifiuta token scaduto', async () => {
    const { db } = await import('@/lib/db/drizzle')
    const expiredRecord = {
      id: 1, userId: 10, token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
    }
    const mockChain = { limit: vi.fn().mockResolvedValue([expiredRecord]) }
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(() => mockChain) })),
    } as never)

    const { verifyPasswordResetToken } = await import('@/lib/auth/password-reset')
    const result = await verifyPasswordResetToken('expired-token')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('Link scaduto. Richiedine uno nuovo.')
  })
})

// ---------------------------------------------------------------------------
// SECTION 4: rate-limit.ts -- checkGeneralRateLimit (in-memory, no DB)
// ---------------------------------------------------------------------------
describe('rate-limit.ts -- checkGeneralRateLimit', () => {
  let checkGeneralRateLimit: (key: string, max: number, windowSec: number) => { blocked: boolean; remaining: number }

  beforeEach(async () => {
    vi.resetModules()
    const mod          = await import('@/lib/auth/rate-limit')
    checkGeneralRateLimit = mod.checkGeneralRateLimit
  })

  it('prima richiesta non bloccata', () => {
    const result = checkGeneralRateLimit('test-ip-1', 3, 60)
    expect(result.blocked).toBe(false)
    expect(result.remaining).toBe(2)
  })

  it('blocca dopo aver superato il massimo', () => {
    const key = 'test-ip-block'
    checkGeneralRateLimit(key, 2, 60)
    checkGeneralRateLimit(key, 2, 60)
    const result = checkGeneralRateLimit(key, 2, 60)
    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('remaining non scende mai sotto zero', () => {
    const key = 'test-ip-floor'
    for (let i = 0; i < 10; i++) checkGeneralRateLimit(key, 2, 60)
    const result = checkGeneralRateLimit(key, 2, 60)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })

  it('chiavi diverse sono indipendenti', () => {
    checkGeneralRateLimit('key-a', 2, 60)
    checkGeneralRateLimit('key-a', 2, 60)
    const resultA = checkGeneralRateLimit('key-a', 2, 60)
    const resultB = checkGeneralRateLimit('key-b', 2, 60)
    expect(resultA.blocked).toBe(true)
    expect(resultB.blocked).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 5: Validazione input -- logica pura (nessuna dipendenza)
// ---------------------------------------------------------------------------
describe('Auth input validation (unit)', () => {
  beforeEach(() => vi.clearAllMocks())

  const validateLoginInput = (email: string, password: string) => {
    if (!email || !password) return { ok: false, error: 'Campi obbligatori' }
    if (!/^.+@.+\..+$/.test(email)) return { ok: false, error: 'Email non valida' }
    if (password.length < 8) return { ok: false, error: 'Password troppo corta' }
    return { ok: true }
  }

  const normalizeEmail = (email: string) => email.trim().toLowerCase()

  it('rifiuta password vuota', () => {
    expect(validateLoginInput('user@test.com', '').ok).toBe(false)
  })

  it('rifiuta email vuota', () => {
    expect(validateLoginInput('', 'password123').ok).toBe(false)
  })

  it('rifiuta email non valida', () => {
    const r = validateLoginInput('not-an-email', 'password123')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Email non valida')
  })

  it('rifiuta password troppo corta (meno di 8 caratteri)', () => {
    const r = validateLoginInput('user@test.com', 'abc')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Password troppo corta')
  })

  it('accetta credenziali valide', () => {
    expect(validateLoginInput('user@test.com', 'password123').ok).toBe(true)
  })

  it('normalizza email (lowercase + trim)', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com')
  })
})
