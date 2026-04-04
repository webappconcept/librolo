import { db } from "@/lib/db/drizzle";
import { ipBlacklist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { disposableDomains } from "./disposable-domains"; // file statico

// Sincrono — file statico
export function isDomainBlacklisted(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return disposableDomains.has(domain);
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
