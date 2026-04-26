// @vitest-environment node
//
// Granular rate-limit coverage
// Fills the gaps left by bruteforce.test.ts:
//   - checkSignupRateLimit  (Redis L1 + DB L2 fallback)
//   - checkAvailabilityRateLimit (Redis L1, graceful-allow when down)
//   - rate-limit-redis.ts internals (INCR/EXPIRE pipeline mocks)
//   - recordSignupAttempt NOT called on availability-check path

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Global fetch mock ────────────────────────────────────────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper: simulate a successful single-command Redis REST response
function mockRedisOk(result: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result }),
  })
}

// Helper: simulate a successful pipeline response
function mockRedisPipeline(results: unknown[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => results.map((r) => ({ result: r })),
  })
}

// Helper: simulate Redis HTTP error (triggers source: "unavailable")
function mockRedisDown() {
  mockFetch.mockRejectedValueOnce(new Error('Redis unreachable'))
}

// ─── Mock DB ──────────────────────────────────────────────────────────────
const mockSelectFn = vi.fn()
const mockInsertFn = vi.fn()
const mockDeleteFn = vi.fn()

function buildSelectChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows)
  const terminal = vi.fn().mockResolvedValue(rows)
  const chain: Record<string, unknown> = {
    from:    vi.fn().mockImplementation(() => chain),
    where:   vi.fn().mockImplementation(() => chain),
    groupBy: vi.fn().mockImplementation(() => chain),
    orderBy: vi.fn().mockImplementation(() => chain),
    limit:   terminal,
    then:    p.then.bind(p),
    catch:   p.catch.bind(p),
    finally: p.finally.bind(p),
  }
  return chain
}

function buildInsertChain() {
  return {
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockResolvedValue([]),
      onConflictDoUpdate:  vi.fn().mockResolvedValue([]),
    }),
  }
}

function buildDeleteChain() {
  const resolved = Promise.resolve(undefined)
  const chain = {
    where: vi.fn().mockReturnValue(
      Object.assign(Promise.resolve(undefined), {
        where: vi.fn().mockReturnValue(Promise.resolve(undefined)),
        catch: (fn: () => void) => { void Promise.resolve(undefined).catch(fn); return Promise.resolve(undefined) },
      })
    ),
    catch:   resolved.catch.bind(resolved),
    then:    resolved.then.bind(resolved),
    finally: resolved.finally.bind(resolved),
  }
  return chain
}

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: mockSelectFn,
    insert: mockInsertFn,
    delete: mockDeleteFn,
  },
}))

// ─── Mock settings ────────────────────────────────────────────────────────
vi.mock('@/lib/db/settings-queries', () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    upstash_redis_rest_url:   'https://fake.upstash.io',
    upstash_redis_rest_token: 'fake-token',
    bf_signin_max:      '5',
    bf_signup_max:      '4',   // basso per testare il blocco facilmente
    bf_check_max:       '10',  // basso per testare il blocco facilmente
    bf_check_window:    '5',
    bf_window_minutes:  '15',
    bf_lockout_minutes: '30',
    bf_alert_threshold: '20',
  }),
}))

vi.mock('server-only', () => ({}))

// ─── beforeEach ───────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()
  mockSelectFn.mockReturnValue(buildSelectChain([]))
  mockInsertFn.mockReturnValue(buildInsertChain())
  mockDeleteFn.mockReturnValue(buildDeleteChain())
})

// ==========================================================================
// SECTION 1 — checkSignupRateLimit
// ==========================================================================
describe('checkSignupRateLimit — Redis L1', () => {
  it('non blocca quando Redis risponde con count < max (remaining corretto)', async () => {
    // peekLogin non viene chiamato per signup — qui arriva direttamente checkAndIncrSignupRedis
    // INCR → 2  (sotto il limite di 4)
    mockRedisOk(2)
    // EXPIRE (count===1 è falso, non viene chiamato)

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkSignupRateLimit('1.2.3.4')

    expect(result.blocked).toBe(false)
    expect(result.remaining).toBe(2) // 4 - 2
  })

  it('blocca quando Redis risponde con count >= max', async () => {
    // INCR → 4 (= limite)
    mockRedisOk(4)

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkSignupRateLimit('1.2.3.4')

    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('blocca oltre il limite (count > max)', async () => {
    mockRedisOk(7)

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkSignupRateLimit('5.5.5.5')

    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('setta EXPIRE solo al primo INCR (count === 1)', async () => {
    // Prima call: INCR → 1 → deve chiamare EXPIRE
    mockRedisOk(1)     // INCR
    mockRedisOk('OK')  // EXPIRE

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    await checkSignupRateLimit('2.2.2.2')

    // fetch chiamato 2 volte: INCR + EXPIRE
    expect(mockFetch).toHaveBeenCalledTimes(2)
    // La seconda call è EXPIRE
    const expireBody = JSON.parse(mockFetch.mock.calls[1][1].body as string) as unknown[]
    expect(expireBody[0]).toBe('EXPIRE')
    expect(expireBody[1]).toBe('rl:signup:2.2.2.2')
  })

  it('non setta EXPIRE quando count > 1', async () => {
    mockRedisOk(3) // INCR → 3, no EXPIRE

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    await checkSignupRateLimit('3.3.3.3')

    // Solo 1 fetch: INCR, nessun EXPIRE
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('checkSignupRateLimit — DB L2 fallback (Redis unavailable)', () => {
  it('usa il DB quando Redis è down — non blocca sotto la soglia', async () => {
    // Redis INCR → errore di rete
    mockRedisDown()
    // DB: blacklist vuota
    mockSelectFn
      .mockReturnValueOnce(buildSelectChain([]))
      // count signup = 2 < 4
      .mockReturnValueOnce(buildSelectChain([{ total: 2 }]))

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkSignupRateLimit('4.4.4.4')

    expect(result.blocked).toBe(false)
    expect(result.remaining).toBe(2) // 4 - 2
  })

  it('usa il DB quando Redis è down — blocca sopra la soglia', async () => {
    mockRedisDown()
    mockSelectFn
      .mockReturnValueOnce(buildSelectChain([]))
      .mockReturnValueOnce(buildSelectChain([{ total: 5 }])) // > 4

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkSignupRateLimit('6.6.6.6')

    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('blacklist blocca il signup immediatamente (DB fallback)', async () => {
    mockRedisDown()
    // Blacklist ha un record per questo IP
    mockSelectFn.mockReturnValueOnce(buildSelectChain([{ id: 42 }]))

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkSignupRateLimit('7.7.7.7')

    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
    // Si ferma alla blacklist: solo 1 select
    expect(mockSelectFn).toHaveBeenCalledTimes(1)
  })
})

// ==========================================================================
// SECTION 2 — checkAvailabilityRateLimit
// ==========================================================================
describe('checkAvailabilityRateLimit — Redis L1', () => {
  it('non blocca quando count < max', async () => {
    mockRedisOk(3) // INCR → 3 < 10

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkAvailabilityRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkAvailabilityRateLimit('1.1.1.1')

    expect(result.blocked).toBe(false)
    expect(result.remaining).toBe(7) // 10 - 3
  })

  it('blocca quando count >= max', async () => {
    mockRedisOk(10) // INCR → 10 = limite

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkAvailabilityRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkAvailabilityRateLimit('1.1.1.1')

    expect(result.blocked).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('usa chiave rl:check:{ip} (non rl:signup né rl:login)', async () => {
    mockRedisOk(1)
    mockRedisOk('OK') // EXPIRE

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkAvailabilityRateLimit } = await import('@/lib/auth/rate-limit')
    await checkAvailabilityRateLimit('8.8.8.8')

    const incrBody = JSON.parse(mockFetch.mock.calls[0][1].body as string) as unknown[]
    expect(incrBody[1]).toBe('rl:check:8.8.8.8')
  })
})

describe('checkAvailabilityRateLimit — Redis unavailable (graceful allow)', () => {
  it('lascia passare senza bloccare quando Redis è down', async () => {
    mockRedisDown()

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkAvailabilityRateLimit } = await import('@/lib/auth/rate-limit')
    const result = await checkAvailabilityRateLimit('9.9.9.9')

    expect(result.blocked).toBe(false)
    // remaining = checkMax (10) dal settings mock
    expect(result.remaining).toBe(10)
  })

  it('NON tocca il DB anche quando Redis è down (solo L1)', async () => {
    mockRedisDown()

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkAvailabilityRateLimit } = await import('@/lib/auth/rate-limit')
    await checkAvailabilityRateLimit('9.9.9.9')

    expect(mockSelectFn).not.toHaveBeenCalled()
    expect(mockInsertFn).not.toHaveBeenCalled()
  })
})

// ==========================================================================
// SECTION 3 — recordSignupAttempt NON chiamato sul path di availability
// ==========================================================================
describe('availability check — nessun recordSignupAttempt', () => {
  it('checkAvailabilityRateLimit non chiama db.insert (non è un tentativo di signup)', async () => {
    mockRedisOk(5)

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkAvailabilityRateLimit } = await import('@/lib/auth/rate-limit')
    await checkAvailabilityRateLimit('1.2.3.4')

    expect(mockInsertFn).not.toHaveBeenCalled()
  })

  it('checkSignupRateLimit via Redis NON chiama db.insert (il contatore è solo su Redis)', async () => {
    mockRedisOk(2) // INCR → 2

    vi.resetModules()
    const { invalidateRedisConfigCache } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const { checkSignupRateLimit } = await import('@/lib/auth/rate-limit')
    await checkSignupRateLimit('1.2.3.4')

    expect(mockInsertFn).not.toHaveBeenCalled()
  })
})

// ==========================================================================
// SECTION 4 — rate-limit-redis.ts internals
// ==========================================================================
describe('checkAndIncrLoginRedis — pipeline INCR+EXPIRE', () => {
  it('non blocca con count coppia < max', async () => {
    // Pipeline INCR×2: pairCount=2, emailCount=1
    mockRedisPipeline([2, 1])
    // EXPIRE per emailCount===1
    mockRedisPipeline([1])

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrLoginRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrLoginRedis('u@x.com', '1.2.3.4', 5, 900)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(false)
      expect(result.remaining).toBeGreaterThan(0)
    }
  })

  it('blocca quando pairCount >= maxAttempts', async () => {
    mockRedisPipeline([5, 2]) // pairCount=5 = limite
    // Nessun EXPIRE (né count è 1)

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrLoginRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrLoginRedis('u@x.com', '1.2.3.4', 5, 900)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(true)
      expect(result.remaining).toBe(0)
    }
  })

  it('blocca quando emailCount >= globalThreshold (maxAttempts * 3)', async () => {
    mockRedisPipeline([1, 15]) // emailCount=15 = 5*3

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrLoginRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrLoginRedis('u@x.com', '9.9.9.9', 5, 900)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(true)
    }
  })

  it('torna source:unavailable quando Redis è down', async () => {
    mockRedisDown()

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrLoginRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrLoginRedis('u@x.com', '1.2.3.4', 5, 900)

    expect(result.source).toBe('unavailable')
  })
})

describe('peekLoginRedis — solo lettura, nessun INCR', () => {
  it('ritorna blocked:false se le chiavi non esistono (null)', async () => {
    mockRedisPipeline([null, null])

    vi.resetModules()
    const { invalidateRedisConfigCache, peekLoginRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await peekLoginRedis('u@x.com', '1.2.3.4', 5, 900)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(false)
      expect(result.remaining).toBe(5)
    }
  })

  it('ritorna blocked:true se pairCount >= max', async () => {
    mockRedisPipeline(['5', '1'])

    vi.resetModules()
    const { invalidateRedisConfigCache, peekLoginRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await peekLoginRedis('u@x.com', '1.2.3.4', 5, 900)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(true)
    }
  })

  it('torna source:unavailable quando Redis è down', async () => {
    mockRedisDown()

    vi.resetModules()
    const { invalidateRedisConfigCache, peekLoginRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await peekLoginRedis('u@x.com', '1.2.3.4', 5, 900)

    expect(result.source).toBe('unavailable')
  })
})

describe('checkAndIncrAvailabilityRedis — INCR + EXPIRE', () => {
  it('non blocca con count < max', async () => {
    mockRedisOk(3)

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrAvailabilityRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrAvailabilityRedis('1.1.1.1', 10, 300)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(false)
      expect(result.remaining).toBe(7)
    }
  })

  it('blocca con count >= max', async () => {
    mockRedisOk(10)

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrAvailabilityRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrAvailabilityRedis('1.1.1.1', 10, 300)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(true)
      expect(result.remaining).toBe(0)
    }
  })

  it('torna source:unavailable quando Redis è down', async () => {
    mockRedisDown()

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrAvailabilityRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrAvailabilityRedis('1.1.1.1', 10, 300)

    expect(result.source).toBe('unavailable')
  })
})

describe('checkAndIncrSignupRedis — INCR + EXPIRE', () => {
  it('non blocca con count < max', async () => {
    mockRedisOk(2)

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrSignupRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrSignupRedis('2.2.2.2', 5, 900)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(false)
      expect(result.remaining).toBe(3)
    }
  })

  it('blocca con count >= max', async () => {
    mockRedisOk(5)

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrSignupRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrSignupRedis('2.2.2.2', 5, 900)

    expect(result.source).toBe('redis')
    if (result.source === 'redis') {
      expect(result.blocked).toBe(true)
      expect(result.remaining).toBe(0)
    }
  })

  it('torna source:unavailable quando Redis è down', async () => {
    mockRedisDown()

    vi.resetModules()
    const { invalidateRedisConfigCache, checkAndIncrSignupRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    const result = await checkAndIncrSignupRedis('2.2.2.2', 5, 900)

    expect(result.source).toBe('unavailable')
  })
})

describe('syncIpBlacklistToRedis — SET e DEL', () => {
  it('chiama SET quando blacklisted=true', async () => {
    mockRedisOk('OK')

    vi.resetModules()
    const { invalidateRedisConfigCache, syncIpBlacklistToRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    await syncIpBlacklistToRedis('3.3.3.3', true)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as unknown[]
    expect(body[0]).toBe('SET')
    expect(body[1]).toBe('rl:blacklist:3.3.3.3')
    expect(body[2]).toBe('1')
  })

  it('chiama DEL quando blacklisted=false', async () => {
    mockRedisOk(1)

    vi.resetModules()
    const { invalidateRedisConfigCache, syncIpBlacklistToRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    await syncIpBlacklistToRedis('3.3.3.3', false)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as unknown[]
    expect(body[0]).toBe('DEL')
    expect(body[1]).toBe('rl:blacklist:3.3.3.3')
  })

  it('non lancia eccezioni se Redis è down (swallows error)', async () => {
    mockRedisDown()

    vi.resetModules()
    const { invalidateRedisConfigCache, syncIpBlacklistToRedis } = await import('@/lib/auth/rate-limit-redis')
    invalidateRedisConfigCache()
    await expect(syncIpBlacklistToRedis('3.3.3.3', true)).resolves.toBeUndefined()
  })
})

// ==========================================================================
// SECTION 5 — credential cache (invalidateRedisConfigCache)
// ==========================================================================
describe('invalidateRedisConfigCache', () => {
  it('forza la ri-lettura delle credenziali dal DB al successivo comando', async () => {
    const { getAppSettings } = await import('@/lib/db/settings-queries')
    const mockedGetSettings = vi.mocked(getAppSettings)

    // Prima call — popola la cache
    mockRedisOk(1)
    vi.resetModules()
    const mod1 = await import('@/lib/auth/rate-limit-redis')
    mod1.invalidateRedisConfigCache()
    await mod1.checkAndIncrSignupRedis('1.1.1.1', 5, 900)
    const callCount1 = mockedGetSettings.mock.calls.length

    // Invalida e seconda call — deve ri-leggere
    mockRedisOk(2)
    mod1.invalidateRedisConfigCache()
    await mod1.checkAndIncrSignupRedis('1.1.1.1', 5, 900)
    const callCount2 = mockedGetSettings.mock.calls.length

    expect(callCount2).toBeGreaterThan(callCount1)
  })
})
