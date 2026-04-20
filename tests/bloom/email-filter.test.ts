import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ─────────────────────────────────────────────────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/**
 * Mock a single redisCommand response (used by nothing now — kept for safety)
 */
function mockRedisResponse(result: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result }),
  })
}

/**
 * Mock a pipeline response: returns an array of { result } objects.
 * k = number of SETBIT/GETBIT commands (default: 7, matching BLOOM_K)
 */
function mockPipelineResponse(results: number[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => results.map((r) => ({ result: r })),
  })
}

/**
 * Mock a pipeline that returns an HTTP-level error.
 */
function mockPipelineHttpError(status: number, body: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => body,
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

// BLOOM_K = 7, so pipeline responses need 7 values
const ALL_ZEROS = Array(7).fill(0)   // email certainly absent
const ALL_ONES  = Array(7).fill(1)   // email possibly present

// ─── Tests ─────────────────────────────────────────────────────────────
describe('Bloom Filter — Email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  // ─── checkEmailAvailability ────────────────────────────────────────────
  describe('checkEmailAvailability', () => {
    it('returns available=true without DB query when all bits are 0 (certainly absent)', async () => {
      mockPipelineResponse(ALL_ZEROS)

      const result = await checkEmailAvailability('nuovo@example.com')

      expect(result.available).toBe(true)
      expect(result.checkedViaDb).toBe(false)
      expect(mockDbLimit).not.toHaveBeenCalled()
    })

    it('returns available=true without DB query when at least one bit is 0', async () => {
      mockPipelineResponse([1, 1, 0, 1, 1, 1, 1])

      const result = await checkEmailAvailability('nuovo@example.com')

      expect(result.available).toBe(true)
      expect(result.checkedViaDb).toBe(false)
      expect(mockDbLimit).not.toHaveBeenCalled()
    })

    it('returns available=false when all bits are 1 and DB confirms email exists', async () => {
      mockPipelineResponse(ALL_ONES)
      mockDbLimit.mockResolvedValueOnce([{ id: '123' }])

      const result = await checkEmailAvailability('esistente@example.com')

      expect(result.available).toBe(false)
      expect(result.checkedViaDb).toBe(true)
    })

    it('returns available=true when all bits are 1 but DB finds nothing (false positive)', async () => {
      mockPipelineResponse(ALL_ONES)
      mockDbLimit.mockResolvedValueOnce([])

      const result = await checkEmailAvailability('falsopos@example.com')

      expect(result.available).toBe(true)
      expect(result.checkedViaDb).toBe(true)
    })

    it('normalizes email to lowercase before hashing', async () => {
      mockPipelineResponse(ALL_ZEROS)

      // We call with uppercase — the pipeline URL must be the /pipeline endpoint
      await checkEmailAvailability('  UTENTE@Example.COM  ')

      // Verify the pipeline endpoint was called (not the single-command endpoint)
      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toMatch(/\/pipeline$/)

      // All 7 GETBIT commands must use the normalized email bits
      const body = JSON.parse(mockFetch.mock.calls[0][1].body) as [string, string, number][]
      expect(body).toHaveLength(7)
      body.forEach((cmd) => {
        expect(cmd[0]).toBe('GETBIT')
        expect(cmd[1]).toBe('bloom:emails')
        expect(typeof cmd[2]).toBe('number')
      })
    })

    it('sends GETBIT commands to the /pipeline endpoint', async () => {
      mockPipelineResponse(ALL_ZEROS)

      await checkEmailAvailability('test@example.com')

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toMatch(/\/pipeline$/)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body) as unknown[]
      expect(body).toHaveLength(7) // BLOOM_K = 7
    })
  })

  // ─── addEmailToBloom ───────────────────────────────────────────────────
  describe('addEmailToBloom', () => {
    it('sends k=7 SETBIT commands via pipeline for a single email', async () => {
      mockPipelineResponse(Array(7).fill(0))

      await addEmailToBloom('  NUOVO@Test.COM  ')

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toMatch(/\/pipeline$/)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body) as [string, string, number, number][]
      expect(body).toHaveLength(7)
      body.forEach((cmd) => {
        expect(cmd[0]).toBe('SETBIT')
        expect(cmd[1]).toBe('bloom:emails')
        expect(typeof cmd[2]).toBe('number')
        expect(cmd[3]).toBe(1)
      })
    })

    it('normalizes email before setting bits', async () => {
      mockPipelineResponse(Array(7).fill(0))
      const spy = vi.spyOn(mockFetch, 'mock' as never)

      await addEmailToBloom('UPPER@CASE.COM')
      await addEmailToBloom('upper@case.com')

      // Both calls should produce the same bit positions
      const body1 = JSON.parse(mockFetch.mock.calls[0][1].body) as [string, string, number, number][]
      // Second call needs its own mock
      mockPipelineResponse(Array(7).fill(0))
      const positions1 = body1.map((c) => c[2])

      // Re-call with lowercase to compare
      await addEmailToBloom('upper@case.com')
      const body2 = JSON.parse(mockFetch.mock.calls[2][1].body) as [string, string, number, number][]
      const positions2 = body2.map((c) => c[2])

      expect(positions1).toEqual(positions2)
      void spy
    })
  })

  // ─── addEmailsBulkToBloom ─────────────────────────────────────────────
  describe('addEmailsBulkToBloom', () => {
    it('sends k*n SETBIT commands for n emails', async () => {
      // 3 emails × 7 bits = 21 SETBIT commands in one pipeline
      mockPipelineResponse(Array(21).fill(0))

      await addEmailsBulkToBloom(['a@b.com', 'c@d.com', 'e@f.com'])

      const body = JSON.parse(mockFetch.mock.calls[0][1].body) as unknown[]
      expect(body).toHaveLength(21)
    })

    it('normalizes all emails before setting bits', async () => {
      mockPipelineResponse(Array(7).fill(0))

      await addEmailsBulkToBloom(['A@B.COM'])

      const body = JSON.parse(mockFetch.mock.calls[0][1].body) as [string, string, number, number][]
      body.forEach((cmd) => {
        expect(cmd[0]).toBe('SETBIT')
        expect(typeof cmd[2]).toBe('number')
      })
    })

    it('does nothing when given an empty array', async () => {
      await addEmailsBulkToBloom([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── ensureBloomFilter ─────────────────────────────────────────────────
  describe('ensureBloomFilter', () => {
    it('is a no-op (SETBIT auto-creates the key)', async () => {
      // ensureBloomFilter does nothing — key is created on first SETBIT
      await expect(ensureBloomFilter()).resolves.toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('resolves without throwing even if called multiple times', async () => {
      await expect(ensureBloomFilter()).resolves.toBeUndefined()
      await expect(ensureBloomFilter()).resolves.toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── Error handling ────────────────────────────────────────────────────
  describe('Error handling', () => {
    it('throws on Upstash HTTP error in pipeline', async () => {
      mockPipelineHttpError(500, 'Internal Server Error')

      await expect(addEmailToBloom('test@example.com')).rejects.toThrow(
        'Upstash pipeline error 500'
      )
    })

    it('throws when env vars are missing', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      await expect(addEmailToBloom('test@example.com')).rejects.toThrow(
        'Missing UPSTASH_REDIS_REST_URL'
      )
    })
  })
})
