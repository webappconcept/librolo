import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockSendCommand = vi.fn()
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    sendCommand: mockSendCommand,
  })),
}))

const mockDbSelect = vi.fn()
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockDbSelect,
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
      mockSendCommand.mockResolvedValueOnce(0)

      const result = await checkEmailAvailability('nuovo@example.com')

      expect(result.available).toBe(true)
      expect(result.checkedViaDb).toBe(false)
      expect(mockDbSelect).not.toHaveBeenCalled()
    })

    it('returns available=false when Bloom says 1 and DB confirms email exists', async () => {
      mockSendCommand.mockResolvedValueOnce(1)
      mockDbSelect.mockResolvedValueOnce([{ id: '123' }])

      const result = await checkEmailAvailability('esistente@example.com')

      expect(result.available).toBe(false)
      expect(result.checkedViaDb).toBe(true)
    })

    it('returns available=true when Bloom says 1 but DB finds nothing (false positive)', async () => {
      mockSendCommand.mockResolvedValueOnce(1)
      mockDbSelect.mockResolvedValueOnce([])

      const result = await checkEmailAvailability('falsopos@example.com')

      expect(result.available).toBe(true)
      expect(result.checkedViaDb).toBe(true)
    })

    it('normalizes email to lowercase before checking', async () => {
      mockSendCommand.mockResolvedValueOnce(0)

      await checkEmailAvailability('  UTENTE@Example.COM  ')

      expect(mockSendCommand).toHaveBeenCalledWith([
        'BF.EXISTS',
        'bloom:emails',
        'utente@example.com',
      ])
    })
  })

  describe('addEmailToBloom', () => {
    it('calls BF.ADD with normalized email', async () => {
      mockSendCommand.mockResolvedValueOnce(1)

      await addEmailToBloom('  NUOVO@Test.COM  ')

      expect(mockSendCommand).toHaveBeenCalledWith([
        'BF.ADD',
        'bloom:emails',
        'nuovo@test.com',
      ])
    })
  })

  describe('addEmailsBulkToBloom', () => {
    it('calls BF.MADD with all normalized emails', async () => {
      mockSendCommand.mockResolvedValueOnce([1, 1, 1])

      await addEmailsBulkToBloom(['A@B.com', 'C@D.com', 'E@F.com'])

      expect(mockSendCommand).toHaveBeenCalledWith([
        'BF.MADD',
        'bloom:emails',
        'a@b.com',
        'c@d.com',
        'e@f.com',
      ])
    })

    it('does nothing when given an empty array', async () => {
      await addEmailsBulkToBloom([])
      expect(mockSendCommand).not.toHaveBeenCalled()
    })
  })

  describe('ensureBloomFilter', () => {
    it('calls BF.RESERVE with correct params', async () => {
      mockSendCommand.mockResolvedValueOnce('OK')

      await ensureBloomFilter()

      expect(mockSendCommand).toHaveBeenCalledWith([
        'BF.RESERVE',
        'bloom:emails',
        '0.01',
        '10000',
        'EXPANSION',
        '2',
        'NONSCALING',
      ])
    })

    it('silently ignores "item exists" error (filter already created)', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('ERR item exists'))

      await expect(ensureBloomFilter()).resolves.not.toThrow()
    })

    it('rethrows unexpected errors', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Connection refused'))

      await expect(ensureBloomFilter()).rejects.toThrow('Connection refused')
    })
  })
})
