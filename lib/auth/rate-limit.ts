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
// [FIX 3 - MEDIUM] Marker speciale per conteggio per-email (tutti gli IP)
// Usa un marker diverso da GENERAL_IP_MARKER per non interferire con
// checkGeneralRateLimit già esistente.
// ---------------------------------------------------------------------------
const PER_EMAIL_ANY_IP_MARKER = "__anyip__";

// ---------------------------------------------------------------------------
// Rate limit per login (email + IP) — basato su DB
// [FIX 3] Aggiunto doppio controllo:
//   1. email + IP specifico (comportamento originale, soglia = maxAttempts)
//   2. email da qualsiasi IP (nuovo, soglia = maxAttempts * 3)
//      → blocca attacchi distribuiti via IP rotation
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

  // Conta tentativi per email + IP specifico (comportamento originale)
  const [resultByEmailIp] = await db
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

  const totalByEmailIp = resultByEmailIp?.total ?? 0;
  if (totalByEmailIp >= cfg.maxAttempts) {
    return {
      blocked: true,
      remaining: 0,
      lockoutMinutes: cfg.lockoutMinutes,
    };
  }

  // [FIX 3] Conta tentativi per sola email da qualsiasi IP
  // Soglia più alta (3x) per non bloccare utenti legittimi che cambiano rete
  const globalEmailThreshold = cfg.maxAttempts * 3;
  const [resultByEmail] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        gte(loginAttempts.attemptedAt, windowStart),
        eq(loginAttempts.success, false),
        // Esclude i marker speciali dei rate limit generici
        sql`${loginAttempts.ip} NOT IN (${GENERAL_IP_MARKER}, ${PER_EMAIL_ANY_IP_MARKER})`,
      ),
    );

  const totalByEmail = resultByEmail?.total ?? 0;
  const remaining = Math.max(
    0,
    Math.min(
      cfg.maxAttempts - totalByEmailIp,
      globalEmailThreshold - totalByEmail,
    ),
  );

  return {
    blocked: totalByEmail >= globalEmailThreshold,
    remaining,
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
// [FIX 1 - HIGH] Rate limit dedicato per sign-up per IP
// Soglie più permissive del login: 10 tentativi / finestra configurata.
// Impedisce spam registrazioni e abuso Resend (invio email di verifica).
// ---------------------------------------------------------------------------
const SIGNUP_EMAIL_MARKER = "__signup__";

export async function checkSignupRateLimit(
  ip: string,
): Promise<{ blocked: boolean; remaining: number }> {
  cleanupOldAttempts();

  const cfg = await getBruteforceConfig();
  // Soglia signup = 2x maxAttempts (default: 10) nella stessa finestra temporale
  const signupMaxAttempts = cfg.maxAttempts * 2;
  const windowStart = new Date(Date.now() - cfg.windowMinutes * 60 * 1000);

  // Controlla prima la blacklist IP
  const [blacklisted] = await db
    .select({ id: ipBlacklist.id })
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ip, ip))
    .limit(1);

  if (blacklisted) {
    return { blocked: true, remaining: 0 };
  }

  const [result] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.email, SIGNUP_EMAIL_MARKER),
        gte(loginAttempts.attemptedAt, windowStart),
        eq(loginAttempts.success, false),
      ),
    );

  const total = result?.total ?? 0;
  return {
    blocked: total >= signupMaxAttempts,
    remaining: Math.max(0, signupMaxAttempts - total),
  };
}

export async function recordSignupAttempt(ip: string): Promise<void> {
  await db
    .insert(loginAttempts)
    .values({ email: SIGNUP_EMAIL_MARKER, ip, success: false });
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

  // Filtra i marker interni dai risultati mostrati in dashboard
  const internalMarkers = new Set([GENERAL_IP_MARKER, SIGNUP_EMAIL_MARKER, PER_EMAIL_ANY_IP_MARKER]);

  return rows
    .filter((r) => r.ip !== GENERAL_IP_MARKER && !internalMarkers.has(r.email))
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
