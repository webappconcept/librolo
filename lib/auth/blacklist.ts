import { db } from "@/lib/db/drizzle";
import { ipBlacklist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isBlockedUsername } from "./blocked-usernames";
import { isDisposableDomain } from "./disposable-domains";

// Cache in-memory via disposable-domains.ts
export async function isDomainBlacklisted(email: string): Promise<boolean> {
  return isDisposableDomain(email);
}

// Cache in-memory via blocked-usernames.ts
export async function isUsernameBlacklisted(username: string): Promise<boolean> {
  return isBlockedUsername(username);
}

// Asincrono — DB diretto (lista IP generalmente piccola)
export async function isIpBlacklisted(ip: string): Promise<boolean> {
  const result = await db
    .select()
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ip, ip))
    .limit(1);
  return result.length > 0;
}
