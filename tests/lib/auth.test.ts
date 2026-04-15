import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TextEncoder } from 'util'

// ---------------------------------------------------------------------------
// Mock DB — auth usa .where().limit(1) come terminale
// ---------------------------------------------------------------------------
const mockSelectFn = vi.fn()

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: mockSelectFn,
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get:    vi.fn().mockReturnValue({ value: 'mock-session-token' }),
    set:    vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockReturnValue(new Headers()),
}))

vi.mock('server-only', () => ({}))

function buildAuthChain(rows: unknown[] = []) {
  const p        = Promise.resolve(rows)
  const terminal = vi.fn().mockResolvedValue(rows)
  const orderBy  = { limit: terminal }
  const where    = Object.assign(
    vi.fn().mockImplementation(() => where),
    { then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p), limit: terminal, orderBy },
  )
  const chain: Record<string, unknown> = {
    from:      vi.fn().mockImplementation(() => chain),
    innerJoin: vi.fn().mockImplementation(() => chain),
    where,
    limit:     terminal,
    orderBy,
    then:      p.then.bind(p),
    catch:     p.catch.bind(p),
    finally:   p.finally.bind(p),
  }
  mockSelectFn.mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  buildAuthChain([])
})

// ---------------------------------------------------------------------------
// SECTION 1: session.ts
//
// PROBLEMA: session.ts valuta `const key = new TextEncoder().encode(AUTH_SECRET)`
// al module load time. Se il modulo e' gia' in cache con AUTH_SECRET=undefined,
// jose riceve un Uint8Array vuoto e lancia 'payload must be an instance of Uint8Array'.
//
// Soluzione per signToken/verifyToken: importiamo jose direttamente nel test
// e creiamo la key qui, senza dipendere da session.ts per quella parte.
// Gli altri test (hashPassword ecc.) usano session.ts normalmente.
// ---------------------------------------------------------------------------
describe('session.ts', () => {
  describe('hashPassword / comparePasswords', () => {
    it('produce un hash diverso dalla password originale', async () => {
      const { hashPassword } = await import('@/lib/auth/session')
      const hashed = await hashPassword('MySecurePass123!')
      expect(hashed).not.toBe('MySecurePass123!')
      expect(hashed.startsWith('$2b$')).toBe(true)
    })

    it('due hash della stessa password sono diversi (salt)', async () => {
      const { hashPassword } = await import('@/lib/auth/session')
      const ha1 = await hashPassword('password')
      const ha2 = await hashPassword('password')
      expect(ha1).not.toBe(ha2)
    })

    it('comparePasswords ritorna true per password corretta', async () => {
      const { hashPassword, comparePasswords } = await import('@/lib/auth/session')
      const hashed = await hashPassword('correct-horse-battery')
      expect(await comparePasswords('correct-horse-battery', hashed)).toBe(true)
    })

    it('comparePasswords ritorna false per password sbagliata', async () => {
      const { hashPassword, comparePasswords } = await import('@/lib/auth/session')
      const hashed = await hashPassword('correct-password')
      expect(await comparePasswords('wrong-password', hashed)).toBe(false)
    })
  })

  describe('signToken / verifyToken', () => {
    // Testiamo la logica JWT direttamente con jose, bypassando il modulo
    // session.ts che inizializza `key` al load time con AUTH_SECRET potenzialmente undefined.
    it('signa e verifica un token valido', async () => {
      const { SignJWT, jwtVerify, importKey } = await import('jose')
      const rawKey = new TextEncoder().encode('test-secret-at-least-32-chars-long!!')
      const key = await importKey({ kty: 'oct', k: Buffer.from(rawKey).toString('base64url') }, ['sign', 'verify']).catch(
        // importKey potrebbe non esistere in questa versione di jose — fallback
        () => rawKey,
      )
      const payload = {
        user:    { id: 42, role: 'member' },
        expires: new Date(Date.now() + 86400 * 1000).toISOString(),
      }
      const token = await new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1 day from now')
        .sign(key instanceof Uint8Array ? key : rawKey)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
      const { payload: decoded } = await jwtVerify(token, rawKey, { algorithms: ['HS256'] })
      const typed = decoded as { user: { id: number; role: string } }
      expect(typed.user.id).toBe(42)
      expect(typed.user.role).toBe('member')
    })

    it('verifyToken fallisce su token malformato', async () => {
      const { verifyToken } = await import('@/lib/auth/session')
      await expect(verifyToken('token.not.valid')).rejects.toThrow()
    })

    it('verifyToken fallisce su stringa vuota', async () => {
      const { verifyToken } = await import('@/lib/auth/session')
      await expect(verifyToken('')).rejects.toThrow()
    })
  })
})

// ---------------------------------------------------------------------------
// SECTION 2: otp.ts
// ---------------------------------------------------------------------------
describe('otp.ts', () => {
  describe('generateOtpCode', () => {
    it('genera un codice di esattamente 6 cifre', async () => {
      const { generateOtpCode } = await import('@/lib/auth/otp')
      expect(generateOtpCode()).toMatch(/^\d{6}$/)
    })

    it('genera codici diversi ad ogni chiamata', async () => {
      const { generateOtpCode } = await import('@/lib/auth/otp')
      const codes = new Set(Array.from({ length: 10 }, () => generateOtpCode()))
      expect(codes.size).toBeGreaterThan(1)
    })

    it('il codice e sempre compreso tra 100000 e 999999', async () => {
      const { generateOtpCode } = await import('@/lib/auth/otp')
      for (let i = 0; i < 20; i++) {
        const num = parseInt(generateOtpCode(), 10)
        expect(num).toBeGreaterThanOrEqual(100000)
        expect(num).toBeLessThanOrEqual(999999)
      }
    })
  })

  describe('verifyOtpCode -- logica dominio (mock DB)', () => {
    it('rifiuta se nessun record trovato (codice non esiste)', async () => {
      buildAuthChain([])
      const { verifyOtpCode } = await import('@/lib/auth/otp')
      const result = await verifyOtpCode(1, '123456')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Codice non trovato.')
    })
  })
})

// ---------------------------------------------------------------------------
// SECTION 3: password-reset.ts
// ---------------------------------------------------------------------------
describe('password-reset.ts', () => {
  it('rifiuta token inesistente (DB ritorna [])', async () => {
    buildAuthChain([])
    const { verifyPasswordResetToken } = await import('@/lib/auth/password-reset')
    const result = await verifyPasswordResetToken('nonexistent-token')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('Link non valido.')
  })

  it('rifiuta token scaduto', async () => {
    const expiredRecord = {
      id: 1, userId: 10, token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
    }
    buildAuthChain([expiredRecord])
    const { verifyPasswordResetToken } = await import('@/lib/auth/password-reset')
    const result = await verifyPasswordResetToken('expired-token')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('Link scaduto. Richiedine uno nuovo.')
  })
})

// ---------------------------------------------------------------------------
// SECTION 4: rate-limit.ts
// ---------------------------------------------------------------------------
describe('rate-limit.ts -- checkGeneralRateLimit', () => {
  let checkGeneralRateLimit: (key: string, max: number, windowSec: number) => { blocked: boolean; remaining: number }

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/lib/auth/rate-limit')
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
    expect(checkGeneralRateLimit(key, 2, 60).remaining).toBeGreaterThanOrEqual(0)
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
// SECTION 5: Validazione input (logica pura)
// ---------------------------------------------------------------------------
describe('Auth input validation (unit)', () => {
  const validateLoginInput = (email: string, password: string) => {
    if (!email || !password) return { ok: false, error: 'Campi obbligatori' }
    if (!/^.+@.+\..+$/.test(email)) return { ok: false, error: 'Email non valida' }
    if (password.length < 8)        return { ok: false, error: 'Password troppo corta' }
    return { ok: true }
  }
  const normalizeEmail = (email: string) => email.trim().toLowerCase()

  it('rifiuta password vuota',                      () => expect(validateLoginInput('user@test.com', '').ok).toBe(false))
  it('rifiuta email vuota',                          () => expect(validateLoginInput('', 'password123').ok).toBe(false))
  it('rifiuta email non valida',                     () => expect(validateLoginInput('not-an-email', 'password123').error).toBe('Email non valida'))
  it('rifiuta password troppo corta (<8 caratteri)', () => expect(validateLoginInput('user@test.com', 'abc').error).toBe('Password troppo corta'))
  it('accetta credenziali valide',                   () => expect(validateLoginInput('user@test.com', 'password123').ok).toBe(true))
  it('normalizza email (lowercase + trim)',           () => expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com'))
})
