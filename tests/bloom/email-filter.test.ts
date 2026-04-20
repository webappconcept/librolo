import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

// Mock fetch globally (redisCommand uses fetch)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockRedisResponse(result: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result }),
  })
}

function mockRedisError(message: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result: null, error: message }),
  })
}

// Mock Drizzle DB
const mockDbLimit = vi.fn()
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockDbLimit,
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  users: { id: 'id', email: 'email' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

vi.mock('server-only', () => ({}))

import {
  checkEmailAvailability,
  addEmailToBloom,
  addEmailsBulkToBloom,
  ensureBloomFilter,
} from '@/lib/bloom/email-filter'

// --- Tests ---

describe('Bloom Filter — Email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  describe('checkEmailAvailability', () => {
    it('returns available=true without DB query when Bloom says 0 (certainly absent)', async () => {
      mockRedisResponse(0)

      const result = await checkEmailAvailability('nuovo@example.com')

      expect(result.available).toBe(true)
      expect(result.checkedViaDb).toBe(false)
      expect(mockDbLimit).not.toHaveBeenCalled()
    })

    it('returns available=false when Bloom says 1 and DB confirms email exists', async () => {
      mockRedisResponse(1)
      mockDbLimit.mockResolvedValueOnce([{ id: '123' }])

      const result = await checkEmailAvailability('esistente@example.com')

      expect(result.available).toBe(false)
      expect(result.checkedViaDb).toBe(true)
    })

    it('returns available=true when Bloom says 1 but DB finds nothing (false positive)', async () => {
      mockRedisResponse(1)
      mockDbLimit.mockResolvedValueOnce([])

      const result = await checkEmailAvailability('falsopos@example.com')

      expect(result.available).toBe(true)
      expect(result.checkedViaDb).toBe(true)
    })

    it('normalizes email to lowercase before checking', async () => {
      mockRedisResponse(0)

      await checkEmailAvailability('  UTENTE@Example.COM  ')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual(['BF.EXISTS', 'bloom:emails', 'utente@example.com'])
    })
  })

  describe('addEmailToBloom', () => {
    it('calls BF.ADD with normalized email', async () => {
      mockRedisResponse(1)

      await addEmailToBloom('  NUOVO@Test.COM  ')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual(['BF.ADD', 'bloom:emails', 'nuovo@test.com'])
    })
  })

  describe('addEmailsBulkToBloom', () => {
    it('calls BF.MADD with all normalized emails', async () => {
      mockRedisResponse([1, 1, 1])

      await addEmailsBulkToBloom(['A@B.com', 'C@D.com', 'E@F.com'])

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual(['BF.MADD', 'bloom:emails', 'a@b.com', 'c@d.com', 'e@f.com'])
    })

    it('does nothing when given an empty array', async () => {
      await addEmailsBulkToBloom([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('ensureBloomFilter', () => {
    it('calls BF.RESERVE with correct params', async () => {
      mockRedisResponse('OK')

      await ensureBloomFilter()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual([
        'BF.RESERVE',
        'bloom:emails',
        0.01,
        10000,
        'EXPANSION',
        2,
        'NONSCALING',
      ])
    })

    it('silently ignores "item exists" error (filter already created)', async () => {
      mockRedisError('ERR item exists')

      await expect(ensureBloomFilter()).resolves.not.toThrow()
    })

    it('rethrows unexpected errors', async () => {
      mockRedisError('Connection refused')

      await expect(ensureBloomFilter()).rejects.toThrow('Connection refused')
    })
  })
})
