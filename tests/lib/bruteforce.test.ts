// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Chain helpers — stesso pattern di tests/lib/auth.test.ts
// ---------------------------------------------------------------------------

function buildDeleteChain() {
  const resolved = Promise.resolve(undefined)
  const chain = {
    where: vi.fn().mockReturnValue(
      Object.assign(Promise.resolve(undefined), {
        where: vi.fn().mockReturnValue(Promise.resolve(undefined)),
        catch: (fn: () => void) => { void Promise.resolve(undefined).catch(fn); return Promise.resolve(undefined) },
      })
    ),
    catch: resolved.catch.bind(resolved),
    then: resolved.then.bind(resolved),
    finally: resolved.finally.bind(resolved),
  }
  return chain
}

function buildInsertChain() {
  return {
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockResolvedValue([]),
      onConflictDoUpdate: vi.fn().mockResolvedValue([]),
    }),
  }
}

function buildSelectChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows)
  const terminal = vi.fn().mockResolvedValue(rows)
  const chain: Record<string, unknown> = {
    from: vi.fn().mockImplementation(() => chain),
    where: vi.fn().mockImplementation(() => chain),
    groupBy: vi.fn().mockImplementation(() => chain),
    orderBy: vi.fn().mockImplementation(() => chain),
    limit: terminal,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  }
  return chain
}

// ---------------------------------------------------------------------------
// Mock DB e settings
// ---------------------------------------------------------------------------
const mockSelectFn = vi.fn()
const mockDeleteFn = vi.fn()
const mockInsertFn = vi.fn()

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: mockSelectFn,
    insert: mockInsertFn,
    delete: mockDeleteFn,
  },
}))

vi.mock('@/lib/db/settings-queries', () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    // Granular rate-limit settings (aligned with getBruteforceConfig)
    bf_signin_max:      '3',
    bf_signup_max:      '10',
    bf_check_max:       '30',
    bf_check_window:    '5',
    // Common
    bf_window_minutes:  '10',
    bf_lockout_minutes: '20',
    bf_alert_threshold: '15',
  }),
}))

vi.mock('server-only', () => ({}))

// ---------------------------------------------------------------------------
// beforeEach — reset e defaults
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks()
  mockDeleteFn.mockReturnValue(buildDeleteChain())
  mockInsertFn.mockReturnValue(buildInsertChain())
  mockSelectFn.mockReturnValue(buildSelectChain([]))
})

// ---------------------------------------------------------------------------
// SECTION 1: checkRateLimit — soglie dal DB
// ---------------------------------------------------------------------------
describe('rate-limit.ts -- checkRateLimit (soglie dal DB)', () => {
  it('blocca l\'IP quando i tentativi superano maxAttempts dal DB', async () => {
    // Prima call: blacklist vuota
    // Seconda call: count tentativi = 4 > signinMax = 3
    mockSelectFn
      .mockReturnValueOnce(buildSelectChain([]))
      .mockReturnValueOnce(buildSelectChain([{ total: 4 }]))

    vi.resetModules()
    const { checkRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkRateLimit('test@example.com', '1.2.3.4')

    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.lockoutMinutes).toBe(20)
  })

  it('non blocca se i tentativi sono sotto la soglia', async () => {
    mockSelectFn
      .mockReturnValueOnce(buildSelectChain([]))
      .mockReturnValueOnce(buildSelectChain([{ total: 1 }]))

    vi.resetModules()
    const { checkRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkRateLimit('test@example.com', '1.2.3.4')

    expect(result.blocked).toBe(false)
    expect(result.remaining).toBe(2) // 3 - 1
  })

  it('non blocca se tentativi === 0', async () => {
    mockSelectFn
      .mockReturnValueOnce(buildSelectChain([]))
      .mockReturnValueOnce(buildSelectChain([{ total: 0 }]))

    vi.resetModules()
    const { checkRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkRateLimit('new@user.com', '9.9.9.9')

    expect(result.blocked).toBe(false)
    expect(result.remaining).toBe(3)
  })

  it('blocca sempre se l\'IP è in blacklist, indipendentemente dai tentativi', async () => {
    // Prima call: blacklist ha un record → stop immediato
    mockSelectFn.mockReturnValueOnce(buildSelectChain([{ id: 99 }]))

    vi.resetModules()
    const { checkRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkRateLimit('any@example.com', '5.5.5.5')

    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
    // Deve fermarsi dopo la prima select (blacklist) senza fare la seconda (count)
    expect(mockSelectFn).toHaveBeenCalledTimes(1)
  })

  it('remaining non scende mai sotto zero', async () => {
    mockSelectFn
      .mockReturnValueOnce(buildSelectChain([]))
      .mockReturnValueOnce(buildSelectChain([{ total: 999 }]))

    vi.resetModules()
    const { checkRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkRateLimit('flood@attacker.com', '6.6.6.6')

    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// SECTION 2: unblockIp / blacklistIp / removeFromBlacklist
// ---------------------------------------------------------------------------
describe('rate-limit.ts -- azioni admin IP', () => {
  it('unblockIp chiama db.delete() una volta', async () => {
    vi.resetModules()
    const { unblockIp } = await import('@/lib/auth/rate-limit')
    await unblockIp('1.2.3.4')
    expect(mockDeleteFn).toHaveBeenCalledTimes(1)
  })

  it('blacklistIp chiama db.insert().values().onConflictDoNothing()', async () => {
    vi.resetModules()
    const { blacklistIp } = await import('@/lib/auth/rate-limit')
    await blacklistIp('9.9.9.9', 'attacco massiccio')
    expect(mockInsertFn).toHaveBeenCalledTimes(1)
    const chain = mockInsertFn.mock.results[0]?.value
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '9.9.9.9', reason: 'attacco massiccio' })
    )
  })

  it('blacklistIp funziona anche senza reason', async () => {
    vi.resetModules()
    const { blacklistIp } = await import('@/lib/auth/rate-limit')
    await blacklistIp('4.4.4.4')
    expect(mockInsertFn).toHaveBeenCalledTimes(1)
  })

  it('removeFromBlacklist chiama db.delete() una volta', async () => {
    vi.resetModules()
    const { removeFromBlacklist } = await import('@/lib/auth/rate-limit')
    await removeFromBlacklist('5.5.5.5')
    expect(mockDeleteFn).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// SECTION 3: validazione schema Zod config (logica pura)
// ---------------------------------------------------------------------------
describe('Bruteforce config — validazione Zod', () => {
  const { z } = require('zod')

  // Schema aggiornato con i 4 campi granulari + 3 comuni
  const ConfigSchema = z.object({
    bf_signin_max:      z.coerce.number().int().min(1).max(100),
    bf_signup_max:      z.coerce.number().int().min(1).max(100),
    bf_check_max:       z.coerce.number().int().min(1).max(500),
    bf_check_window:    z.coerce.number().int().min(1).max(60),
    bf_window_minutes:  z.coerce.number().int().min(1).max(1440),
    bf_lockout_minutes: z.coerce.number().int().min(1).max(10080),
    bf_alert_threshold: z.coerce.number().int().min(1).max(1000),
  })

  const validPayload = {
    bf_signin_max: '5',   bf_signup_max: '10',
    bf_check_max: '30',   bf_check_window: '5',
    bf_window_minutes: '15', bf_lockout_minutes: '30', bf_alert_threshold: '20',
  }

  it('accetta valori validi', () => {
    expect(ConfigSchema.safeParse(validPayload).success).toBe(true)
  })

  it('rifiuta bf_signin_max = 0', () => {
    expect(ConfigSchema.safeParse({ ...validPayload, bf_signin_max: '0' }).success).toBe(false)
  })

  it('rifiuta bf_signin_max > 100', () => {
    expect(ConfigSchema.safeParse({ ...validPayload, bf_signin_max: '101' }).success).toBe(false)
  })

  it('rifiuta bf_window_minutes > 1440 (più di 24h)', () => {
    expect(ConfigSchema.safeParse({ ...validPayload, bf_window_minutes: '1441' }).success).toBe(false)
  })

  it('rifiuta bf_lockout_minutes > 10080 (più di 7 giorni)', () => {
    expect(ConfigSchema.safeParse({ ...validPayload, bf_lockout_minutes: '10081' }).success).toBe(false)
  })
})
