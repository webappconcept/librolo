import { db } from "@/lib/db/drizzle";
import { ipBlacklist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isDisposableDomain } from "./disposable-domains";

// Query al DB tramite cache in-memory (vedi disposable-domains.ts)
export async function isDomainBlacklisted(email: string): Promise<boolean> {
  return isDisposableDomain(email);
}

// Asincrono — DB
export async function isIpBlacklisted(ip: string): Promise<boolean> {
  const result = await db
    .select()
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ip, ip))
    .limit(1);
  return result.length > 0;
}
