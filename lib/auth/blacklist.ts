// lib/auth/blacklist.ts
//
// Blacklist IP/dominio/username.
// isIpBlacklisted usa Redis come L1 cache (miss → fallback DB).
// isUsernameBlacklisted delega a isBlockedUsername (in-memory cache + pattern matching).

import { db } from "@/lib/db/drizzle";
import { disposableDomains, ipBlacklist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isBlockedUsername } from "./blocked-usernames";
import { isIpBlacklistedRedis } from "./rate-limit-redis";

/**
 * Controlla se un IP è in blacklist.
 * L1: Redis (< 1ms) — L2: DB (fallback se Redis è unavailable).
 */
export async function isIpBlacklisted(ip: string): Promise<boolean> {
  // L1: Redis
  const redisResult = await isIpBlacklistedRedis(ip);
  if (redisResult !== null) return redisResult;

  // L2: DB fallback
  const [row] = await db
    .select({ id: ipBlacklist.id })
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ip, ip))
    .limit(1);

  return row !== undefined;
}

export async function isDomainBlacklisted(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  const [row] = await db
    .select({ id: disposableDomains.id })
    .from(disposableDomains)
    .where(eq(disposableDomains.domain, domain))
    .limit(1);

  return row !== undefined;
}

export async function isUsernameBlacklisted(username: string): Promise<boolean> {
  return isBlockedUsername(username);
}
