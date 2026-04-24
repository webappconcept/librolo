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
 * Cache in-memory: la lista viene caricata dal DB una volta ogni 5 minuti.
 */

import { db } from "@/lib/db/drizzle";
import { blockedUsernames } from "@/lib/db/schema";

type BlockedEntry = { username: string; isPattern: boolean };

let _cache: BlockedEntry[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadBlockedUsernames(): Promise<BlockedEntry[]> {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL_MS) return _cache;

  const rows = await db
    .select({ username: blockedUsernames.username, isPattern: blockedUsernames.isPattern })
    .from(blockedUsernames);

  _cache = rows.map((r) => ({
    username: r.username.toLowerCase(),
    isPattern: r.isPattern,
  }));
  _cacheTime = now;
  return _cache;
}

/** Invalida la cache (chiamare dopo add/remove dall'admin) */
export function invalidateBlockedUsernamesCache(): void {
  _cache = null;
  _cacheTime = 0;
}

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
