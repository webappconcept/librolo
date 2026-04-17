// lib/auth/rate-limit.ts
import { db } from "@/lib/db/drizzle";
import { loginAttempts, ipBlacklist } from "@/lib/db/schema";
import { getAppSettings } from "@/lib/db/settings-queries";
import { and, count, eq, gte, lt, desc, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers per leggere le soglie dal DB (con fallback agli hardcoded)
// ---------------------------------------------------------------------------
async function getBruteforceConfig() {
  try {
    const s = await getAppSettings();
    return {
      maxAttempts: parseInt(s.bf_max_attempts, 10) || 5,
      windowMinutes: parseInt(s.bf_window_minutes, 10) || 15,
      lockoutMinutes: parseInt(s.bf_lockout_minutes, 10) || 30,
      alertThreshold: parseInt(s.bf_alert_threshold, 10) || 20,
    };
  } catch {
    return { maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 30, alertThreshold: 20 };
  }
}

// ---------------------------------------------------------------------------
// Cleanup asincrono — fire-and-forget, non blocca la request
// ---------------------------------------------------------------------------
function cleanupOldAttempts(): void {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  void db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, cutoff))
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Rate limit per login (email + IP) — basato su DB
// ---------------------------------------------------------------------------
export async function checkRateLimit(
  email: string,
  ip: string,
): Promise<{ blocked: boolean; remaining: number; lockoutMinutes: number }> {
  cleanupOldAttempts();

  const cfg = await getBruteforceConfig();
  const windowStart = new Date(Date.now() - cfg.windowMinutes * 60 * 1000);

  // Controlla prima la blacklist IP
  const [blacklisted] = await db
    .select({ id: ipBlacklist.id })
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ip, ip))
    .limit(1);

  if (blacklisted) {
    return { blocked: true, remaining: 0, lockoutMinutes: cfg.lockoutMinutes };
  }

  const [result] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.ip, ip),
        gte(loginAttempts.attemptedAt, windowStart),
        eq(loginAttempts.success, false),
      ),
    );

  const total = result?.total ?? 0;
  return {
    blocked: total >= cfg.maxAttempts,
    remaining: Math.max(0, cfg.maxAttempts - total),
    lockoutMinutes: cfg.lockoutMinutes,
  };
}

export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
): Promise<void> {
  await db.insert(loginAttempts).values({ email, ip, success });
}

// ---------------------------------------------------------------------------
// Rate limit generico
// ---------------------------------------------------------------------------
const GENERAL_IP_MARKER = "__general__";

export async function checkGeneralRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<{ blocked: boolean; remaining: number }> {
  cleanupOldAttempts();

  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  const [result] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, key),
        eq(loginAttempts.ip, GENERAL_IP_MARKER),
        gte(loginAttempts.attemptedAt, windowStart),
        eq(loginAttempts.success, false),
      ),
    );

  const total = result?.total ?? 0;
  return {
    blocked: total >= maxAttempts,
    remaining: Math.max(0, maxAttempts - total),
  };
}

export async function recordGeneralAttempt(key: string): Promise<void> {
  await db
    .insert(loginAttempts)
    .values({ email: key, ip: GENERAL_IP_MARKER, success: false });
}

// ---------------------------------------------------------------------------
// Queries admin — usate dalle server actions della pagina Bruteforce
// ---------------------------------------------------------------------------

export type BruteforceEntry = {
  ip: string;
  email: string;
  attempts: number;
  lastAttempt: Date;
  isBlacklisted: boolean;
};

/** IP con più tentativi falliti nelle ultime 24h */
export async function getTopOffenders(limit = 50): Promise<BruteforceEntry[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      ip: loginAttempts.ip,
      email: loginAttempts.email,
      attempts: count(),
      lastAttempt: sql<Date>`max(${loginAttempts.attemptedAt})`,
    })
    .from(loginAttempts)
    .where(
      and(
        gte(loginAttempts.attemptedAt, cutoff),
        eq(loginAttempts.success, false),
      ),
    )
    .groupBy(loginAttempts.ip, loginAttempts.email)
    .orderBy(desc(sql`count(*)`))    
    .limit(limit);

  const blacklist = await db.select({ ip: ipBlacklist.ip }).from(ipBlacklist);
  const blacklistedIps = new Set(blacklist.map((r) => r.ip));

  return rows
    .filter((r) => r.ip !== GENERAL_IP_MARKER)
    .map((r) => ({
      ip: r.ip,
      email: r.email,
      attempts: r.attempts,
      lastAttempt: r.lastAttempt,
      isBlacklisted: blacklistedIps.has(r.ip),
    }));
}

/** Sblocca un IP: cancella i suoi tentativi falliti nella finestra attiva */
export async function unblockIp(ip: string): Promise<void> {
  const cfg = await getBruteforceConfig();
  const windowStart = new Date(Date.now() - cfg.windowMinutes * 60 * 1000);
  await db
    .delete(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        gte(loginAttempts.attemptedAt, windowStart),
        eq(loginAttempts.success, false),
      ),
    );
}

/** Blacklist IP permanente */
export async function blacklistIp(ip: string, reason?: string): Promise<void> {
  await db
    .insert(ipBlacklist)
    .values({ ip, reason: reason ?? null })
    .onConflictDoNothing();
}

/** Rimuove un IP dalla blacklist */
export async function removeFromBlacklist(ip: string): Promise<void> {
  await db.delete(ipBlacklist).where(eq(ipBlacklist.ip, ip));
}

/** Lista IP in blacklist */
export async function getBlacklist() {
  return db.select().from(ipBlacklist).orderBy(desc(ipBlacklist.createdAt));
}
