import 'server-only'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { BloomEmailCheckResult } from './types'

const BLOOM_KEY = 'bloom:emails'
const BLOOM_ERROR_RATE = 0.01
const BLOOM_INITIAL_CAPACITY = 10_000

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error(
      'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env variables'
    )
  }
  return { url, token }
}

async function redisCommand<T = unknown>(command: (string | number)[]): Promise<T> {
  const { url, token } = getRedisConfig()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upstash REST error ${res.status}: ${text}`)
  }
  const json = (await res.json()) as { result: T; error?: string }
  if (json.error) {
    throw new Error(json.error)
  }
  return json.result
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Ensures the Bloom filter key exists in Redis with proper settings.
 * Safe to call multiple times (BF.RESERVE is a no-op if key exists).
 */
export async function ensureBloomFilter(): Promise<void> {
  try {
    await redisCommand([
      'BF.RESERVE',
      BLOOM_KEY,
      BLOOM_ERROR_RATE,
      BLOOM_INITIAL_CAPACITY,
      'EXPANSION',
      2,
      'NONSCALING',
    ])
  } catch (err: unknown) {
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
  await redisCommand(['BF.ADD', BLOOM_KEY, normalized])
}

/**
 * Adds multiple emails at once (used by seed script).
 */
export async function addEmailsBulkToBloom(emails: string[]): Promise<void> {
  if (emails.length === 0) return
  const normalized = emails.map(normalizeEmail)
  await redisCommand(['BF.MADD', BLOOM_KEY, ...normalized])
}

/**
 * Checks if an email is already registered.
 *
 * Flow:
 * 1. BF.EXISTS on Upstash REST API (O(1), sub-millisecond)
 * 2. If possibly present (1) → confirm with DB query (eliminates false positives)
 * 3. If certainly absent (0) → skip DB entirely
 *
 * Returns { available: boolean, checkedViaDb: boolean }
 */
export async function checkEmailAvailability(
  email: string
): Promise<BloomEmailCheckResult> {
  const normalized = normalizeEmail(email)

  const bloomResult = await redisCommand<number>([
    'BF.EXISTS',
    BLOOM_KEY,
    normalized,
  ])

  if (bloomResult === 0) {
    return { available: true, checkedViaDb: false }
  }

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
