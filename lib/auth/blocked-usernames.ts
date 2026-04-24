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

export function invalidateBlockedUsernamesCache(): void {
  _cache = null;
  _cacheTime = 0;
}

function matchesEntry(input: string, entry: BlockedEntry): boolean {
  if (!entry.isPattern) return input === entry.username;

  const p = entry.username;
  const startsWild = p.startsWith("*");
  const endsWild = p.endsWith("*");
  const core = p.replace(/^\*|\*$/g, "");

  if (!core) return false;
  if (startsWild && endsWild) return input.includes(core);
  if (startsWild) return input.endsWith(core);
  if (endsWild) return input.startsWith(core);
  return input === core;
}

export async function isBlockedUsername(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (!clean) return false;
  const entries = await loadBlockedUsernames();
  return entries.some((e) => matchesEntry(clean, e));
}
