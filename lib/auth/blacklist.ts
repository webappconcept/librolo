// lib/auth/blacklist.ts
//
// Blacklist IP/dominio/username.
// isIpBlacklisted usa Redis come L1 cache (miss → fallback DB).

import { db } from "@/lib/db/drizzle";
import { domainBlacklist, ipBlacklist, usernameBlacklist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
    .select({ id: domainBlacklist.id })
    .from(domainBlacklist)
    .where(eq(domainBlacklist.domain, domain))
    .limit(1);

  return row !== undefined;
}

export async function isUsernameBlacklisted(username: string): Promise<boolean> {
  const normalized = username.toLowerCase();

  const [row] = await db
    .select({ id: usernameBlacklist.id })
    .from(usernameBlacklist)
    .where(eq(usernameBlacklist.username, normalized))
    .limit(1);

  return row !== undefined;
}
