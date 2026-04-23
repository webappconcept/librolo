import { db } from "@/lib/db/drizzle";
import { userProfiles, users } from "@/lib/db/schema";
import { getAppSettings } from "@/lib/db/settings-queries";
import { eq } from "drizzle-orm";
import type { BloomEmailCheckResult } from "./types";

// ─── Bloom filter config ───────────────────────────────────────────────────
// m = number of bits, k = number of hash functions
// m=200_000 + k=7 → ~1% false positive rate for up to 20_000 emails
// Formula: m = -n*ln(p) / (ln2)^2  |  k = m/n * ln2
const BLOOM_KEY_EMAILS = "bloom:emails";
const BLOOM_KEY_USERNAMES = "bloom:usernames";
const BLOOM_M = 200_000; // bit array size
const BLOOM_K = 7; // number of hash functions

// ─── Redis REST client ────────────────────────────────────────────────────
async function getRedisConfig() {
  // Prima prova il DB (configurazione admin)
  const settings = await getAppSettings();
  const url = settings.upstash_redis_rest_url;
  const token = settings.upstash_redis_rest_token;

  if (!url || !token) {
    throw new Error(
      "Missing Upstash Redis credentials. Configure them in Admin → Redis or set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env",
    );
  }
  return { url, token };
}

async function redisCommand<T = unknown>(
  command: (string | number)[],
): Promise<T> {
  const { url, token } = await getRedisConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash REST error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { result: T; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

async function redisPipeline(
  commands: (string | number)[][],
): Promise<unknown[]> {
  const { url, token } = await getRedisConfig();
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash pipeline error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { result: unknown; error?: string }[];
  return json.map((r) => r.result);
}

// ─── Hash functions ───────────────────────────────────────────────────────
// Two independent hash functions (h1, h2) combined as h(i) = h1 + i*h2
// (Kirsch-Mitzenmacher technique — gives k independent hashes cheaply)
function hashEmail(email: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < email.length; i++) {
    h = Math.imul(h ^ email.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return Math.abs(h);
}

function getBitPositions(email: string): number[] {
  const h1 = hashEmail(email, 0x811c9dc5);
  const h2 = hashEmail(email, 0xc4ceb9fe);
  const positions: number[] = [];
  for (let i = 0; i < BLOOM_K; i++) {
    positions.push((h1 + i * h2) % BLOOM_M);
  }
  return positions;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * No-op — kept for API compatibility with seed script and actions.
 * With SETBIT/GETBIT the key is created automatically on first write.
 */
export async function ensureBloomFilter(): Promise<void> {
  // SETBIT auto-creates the key — nothing to do here
}

/**
 * Adds an email to the Bloom filter.
 * Fires k SETBIT commands in a single pipeline.
 */
export async function addEmailToBloom(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const positions = getBitPositions(normalized);
  const commands = positions.map((pos) => ["SETBIT", BLOOM_KEY_EMAILS, pos, 1]);
  await redisPipeline(commands);
}

/**
 * Adds multiple emails at once using pipelined SETBIT.
 * Batches to avoid oversized payloads.
 */
export async function addEmailsBulkToBloom(emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  const PIPE_BATCH = 200;
  const commands: (string | number)[][] = [];
  for (const email of emails) {
    const normalized = normalizeEmail(email);
    const positions = getBitPositions(normalized);
    for (const pos of positions) {
      commands.push(["SETBIT", BLOOM_KEY_EMAILS, pos, 1]);
    }
    if (commands.length >= PIPE_BATCH * BLOOM_K) {
      await redisPipeline(commands.splice(0, commands.length));
    }
  }
  if (commands.length > 0) {
    await redisPipeline(commands);
  }
}

/**
 * Checks if an email is possibly registered.
 *
 * Flow:
 * 1. k GETBIT commands via pipeline (O(k), sub-millisecond)
 * 2. If ALL bits = 1 → possibly present → confirm via DB (eliminate false positives)
 * 3. If ANY bit = 0 → certainly absent → skip DB
 */
export async function checkEmailAvailability(
  email: string,
): Promise<BloomEmailCheckResult> {
  const normalized = normalizeEmail(email);

  try {
    const positions = getBitPositions(normalized);
    const commands = positions.map((pos) => ["GETBIT", BLOOM_KEY_EMAILS, pos]);
    const results = (await redisPipeline(commands)) as number[];
    const possiblyPresent = results.every((bit) => bit === 1);

    if (!possiblyPresent) {
      return { available: true, checkedViaDb: false };
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    return { available: existing.length === 0, checkedViaDb: true };
  } catch (err) {
    // Redis non raggiungibile → fallback diretto al DB
    console.error("[bloom] Redis unavailable, falling back to DB:", err);
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    return { available: existing.length === 0, checkedViaDb: true };
  }
}

// ─── API PER USERNAME ───────────────────────────────────────────────────────

export async function addUsernameToBloom(username: string): Promise<void> {
  const normalized = username.trim().toLowerCase();
  const positions = getBitPositions(normalized);
  const commands = positions.map((pos) => [
    "SETBIT",
    BLOOM_KEY_USERNAMES,
    pos,
    1,
  ]);
  await redisPipeline(commands);
}

export async function checkUsernameAvailability(
  username: string,
): Promise<BloomEmailCheckResult> {
  const normalized = username.trim().toLowerCase();

  try {
    const positions = getBitPositions(normalized);
    const commands = positions.map((pos) => [
      "GETBIT",
      BLOOM_KEY_USERNAMES,
      pos,
    ]);
    const results = (await redisPipeline(commands)) as number[];
    const possiblyPresent = results.every((bit) => bit === 1);

    if (!possiblyPresent) {
      return { available: true, checkedViaDb: false };
    }

    const existing = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.username, normalized))
      .limit(1);

    return { available: existing.length === 0, checkedViaDb: true };
  } catch (err) {
    console.error("[bloom] Redis unavailable, falling back to DB:", err);
    const existing = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.username, normalized))
      .limit(1);

    return { available: existing.length === 0, checkedViaDb: true };
  }
}
