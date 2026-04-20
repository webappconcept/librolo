import 'server-only'
import { Redis } from '@upstash/redis'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { BloomEmailCheckResult } from './types'

const BLOOM_KEY = 'bloom:emails'
const BLOOM_ERROR_RATE = 0.01
const BLOOM_INITIAL_CAPACITY = 10_000

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Ensures the Bloom filter key exists in Redis with proper settings.
 * Safe to call multiple times (BF.RESERVE is a no-op if key exists).
 */
export async function ensureBloomFilter(): Promise<void> {
  try {
    await redis.call(
      'BF.RESERVE',
      BLOOM_KEY,
      String(BLOOM_ERROR_RATE),
      String(BLOOM_INITIAL_CAPACITY),
      'EXPANSION',
      '2',
      'NONSCALING'
    )
  } catch (err: unknown) {
    // ERR item exists = filter already created, safe to ignore
    if (
      err instanceof Error &&
      err.message.includes('item exists')
    ) {
      return
    }
    throw err
  }
}

/**
 * Adds an email to the Bloom filter.
 * Call this after a successful registration.
 */
export async function addEmailToBloom(email: string): Promise<void> {
  const normalized = normalizeEmail(email)
  await redis.call('BF.ADD', BLOOM_KEY, normalized)
}

/**
 * Adds multiple emails at once (used by seed script).
 */
export async function addEmailsBulkToBloom(emails: string[]): Promise<void> {
  if (emails.length === 0) return
  const normalized = emails.map(normalizeEmail)
  await redis.call('BF.MADD', BLOOM_KEY, ...normalized)
}

/**
 * Checks if an email is already registered.
 *
 * Flow:
 * 1. BF.EXISTS on Upstash (O(1), sub-millisecond)
 * 2. If possibly present (1) → confirm with DB query (eliminates false positives)
 * 3. If certainly absent (0) → skip DB entirely
 *
 * Returns { available: boolean, checkedViaDb: boolean }
 */
export async function checkEmailAvailability(
  email: string
): Promise<BloomEmailCheckResult> {
  const normalized = normalizeEmail(email)

  const bloomResult = await redis.call('BF.EXISTS', BLOOM_KEY, normalized)

  // Bloom says "certainly not present" → no DB query needed
  if (bloomResult === 0) {
    return { available: true, checkedViaDb: false }
  }

  // Bloom says "possibly present" → confirm via DB to rule out false positives
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1)

  return {
    available: existing.length === 0,
    checkedViaDb: true,
  }
}
