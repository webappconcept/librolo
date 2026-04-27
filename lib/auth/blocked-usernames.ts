/**
 * blocked-usernames.ts
 *
 * Verifica se uno username è nella lista degli username riservati/bloccati.
 * Supporta sia voci esatte che pattern wildcard:
 *   - "*parola*"  → contains
 *   - "parola*"   → starts_with
 *   - "*parola"   → ends_with
 *   - "parola"    → exact match
 *
 * Strategia cache a due livelli:
 *   L1 Redis  — chiave "blacklist:usernames" (JSON), TTL 5 min.
 *               Condivisa tra tutte le istanze; sopravvive ai cold start.
 *   L2 Memory — fallback se Redis è unavailable; dura fino al prossimo
 *               cold start (accettabile: il DB è la fonte di verità).
 *
 * Invalidazione: chiamare invalidateBlockedUsernamesCache() dopo ogni
 * INSERT / DELETE su blockedUsernames (es. dall'admin).
 */

import { db } from "@/lib/db/drizzle";
import { blockedUsernames } from "@/lib/db/schema";
import { redisCmd } from "./rate-limit-redis";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

type BlockedEntry = { username: string; isPattern: boolean };

// ---------------------------------------------------------------------------
// Cache Redis key
// ---------------------------------------------------------------------------

const REDIS_KEY = "blacklist:usernames";
const REDIS_TTL = 300; // 5 minuti

// ---------------------------------------------------------------------------
// Cache in-memory L2 (fallback se Redis è down)
// ---------------------------------------------------------------------------

let _memCache: BlockedEntry[] | null = null;
let _memCacheTime = 0;
const MEM_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadFromDb(): Promise<BlockedEntry[]> {
  const rows = await db
    .select({ username: blockedUsernames.username, isPattern: blockedUsernames.isPattern })
    .from(blockedUsernames);

  return rows.map((r) => ({
    username: r.username.toLowerCase(),
    isPattern: r.isPattern,
  }));
}

async function loadBlockedUsernames(): Promise<BlockedEntry[]> {
  // --- L1: Redis ---
  try {
    const cached = await redisCmd<string | null>(["GET", REDIS_KEY]);
    if (cached !== null) {
      return JSON.parse(cached) as BlockedEntry[];
    }
  } catch {
    // Redis unavailable → prosegui con L2
  }

  // --- L2: in-memory ---
  const now = Date.now();
  if (_memCache && now - _memCacheTime < MEM_TTL_MS) {
    return _memCache;
  }

  // --- DB (fonte di verità) ---
  const entries = await loadFromDb();

  // Scrivi su Redis (L1)
  try {
    await redisCmd(["SET", REDIS_KEY, JSON.stringify(entries), "EX", REDIS_TTL]);
  } catch {
    // Redis down: salviamo solo in memoria
  }

  // Aggiorna cache in-memory (L2)
  _memCache = entries;
  _memCacheTime = now;

  return entries;
}

// ---------------------------------------------------------------------------
// Invalidazione
// ---------------------------------------------------------------------------

/** Invalida L1 Redis + L2 memory. Chiamare dopo add/remove dall'admin. */
export async function invalidateBlockedUsernamesCache(): Promise<void> {
  // L2 memory
  _memCache = null;
  _memCacheTime = 0;

  // L1 Redis
  try {
    await redisCmd(["DEL", REDIS_KEY]);
  } catch (err) {
    console.error("[blocked-usernames] Redis DEL failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/**
 * Confronta uno username con una singola voce (esatta o pattern).
 * Pattern syntax:
 *   *parola*  → contains
 *   parola*   → starts_with
 *   *parola   → ends_with
 *   parola    → exact
 */
function matchesEntry(input: string, entry: BlockedEntry): boolean {
  const { username, isPattern } = entry;
  if (!isPattern) return input === username;

  const startsWithAsterisk = username.startsWith("*");
  const endsWithAsterisk = username.endsWith("*");
  const core = username.replace(/^\*/, "").replace(/\*$/, "");

  if (startsWithAsterisk && endsWithAsterisk) return input.includes(core);
  if (startsWithAsterisk) return input.endsWith(core);
  if (endsWithAsterisk) return input.startsWith(core);
  return input === core;
}

// ---------------------------------------------------------------------------
// Export principale
// ---------------------------------------------------------------------------

/**
 * Restituisce true se lo username corrisponde a una voce bloccata
 * (esatta o pattern). Il confronto è case-insensitive.
 */
export async function isBlockedUsername(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (!clean) return false;
  const entries = await loadBlockedUsernames();
  return entries.some((entry) => matchesEntry(clean, entry));
}
