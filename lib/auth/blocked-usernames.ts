/**
 * blocked-usernames.ts
 *
 * Verifica se uno username è nella lista degli username riservati/bloccati.
 * Gli username sono gestiti tramite la tabella `blocked_usernames` su Supabase
 * e amministrabili da Security → Username Bloccati.
 *
 * Cache in-memory: la lista viene caricata dal DB una volta ogni 5 minuti
 * per evitare una query a ogni check di registrazione.
 */

import { db } from "@/lib/db/drizzle";
import { blockedUsernames } from "@/lib/db/schema";

let _cache: Set<string> | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti

async function loadBlockedUsernames(): Promise<Set<string>> {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL_MS) return _cache;

  const rows = await db
    .select({ username: blockedUsernames.username })
    .from(blockedUsernames);
  _cache = new Set(rows.map((r) => r.username.toLowerCase()));
  _cacheTime = now;
  return _cache;
}

/** Invalida la cache (chiamare dopo add/remove dall'admin) */
export function invalidateBlockedUsernamesCache(): void {
  _cache = null;
  _cacheTime = 0;
}

/**
 * Restituisce true se lo username è nella lista bloccati.
 * Il confronto è case-insensitive.
 */
export async function isBlockedUsername(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (!clean) return false;
  const blocked = await loadBlockedUsernames();
  return blocked.has(clean);
}
