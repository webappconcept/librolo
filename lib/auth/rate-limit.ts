// lib/auth/rate-limit.ts
//
// Dual-layer rate limiting:
//   L1 — Redis (Upstash): check in-memory <2ms, nessun carico su DB
//   L2 — DB (Postgres/Drizzle): fallback se Redis non è disponibile
//                                + storage storico per la dashboard admin
//
// Il DB riceve sempre recordLoginAttempt in background (fire-and-forget)
// così la dashboard bruteforce rimane invariata.

import { db } from "@/lib/db/drizzle";
import { loginAttempts, ipBlacklist } from "@/lib/db/schema";
import { getAppSettings } from "@/lib/db/settings-queries";
import { and, count, eq, gte, lt, desc, sql } from "drizzle-orm";
import {
  checkAndIncrLoginRedis,
  checkAndIncrSignupRedis,
  peekLoginRedis,
  unblockIpRedis,
} from "./rate-limit-redis";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
async function getBruteforceConfig() {
  try {
    const s = await getAppSettings();
    return {
      maxAttempts:    parseInt(s.bf_max_attempts,    10) || 5,
      windowMinutes:  parseInt(s.bf_window_minutes,  10) || 15,
      lockoutMinutes: parseInt(s.bf_lockout_minutes, 10) || 30,
      alertThreshold: parseInt(s.bf_alert_threshold, 10) || 20,
    };
  } catch {
    return { maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 30, alertThreshold: 20 };
  }
}

// ---------------------------------------------------------------------------
// Cleanup DB asincrono — fire-and-forget
// ---------------------------------------------------------------------------
function cleanupOldAttempts(): void {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  void db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, cutoff))
    .catch((err: unknown) => {
      console.error("[cleanupOldAttempts] failed to delete old login attempts:", err);
    });
}

// ---------------------------------------------------------------------------
// Marker interni DB (invariati — la dashboard li filtra già)
// ---------------------------------------------------------------------------
const GENERAL_IP_MARKER         = "__general__";
const SIGNUP_EMAIL_MARKER       = "__signup__";
const PER_EMAIL_ANY_IP_MARKER   = "__anyip__";

// ---------------------------------------------------------------------------
// checkRateLimit — DUAL LAYER
// ---------------------------------------------------------------------------

/**
 * Controlla il rate limit per il login.
 *
 * Flusso:
 *   1. Redis L1: peekLoginRedis (solo GET, no INCR) per vedere se già bloccato
 *      → bloccato: ritorna subito senza toccare il DB
 *   2. Redis L1: checkAndIncrLoginRedis (INCR) se non ancora bloccato
 *      → il contatore Redis viene incrementato
 *   3. DB L2 fallback: se Redis è unavailable usa la logica DB originale
 *
 * Nota: recordLoginAttempt sul DB viene chiamato separatamente da signIn/signUp
 * (come prima) — rimane il source of truth per la dashboard.
 */
export async function checkRateLimit(
  email: string,
  ip: string,
): Promise<{ blocked: boolean; remaining: number; lockoutMinutes: number }> {
  const cfg = await getBruteforceConfig();
  const windowSeconds = cfg.windowMinutes * 60;

  // ── L1: Redis ────────────────────────────────────────────────────────────
  const peek = await peekLoginRedis(email, ip, cfg.maxAttempts, windowSeconds);

  if (peek.source === "redis") {
    if (peek.blocked) {
      // Già bloccato — ritorna senza INCR e senza DB
      return {
        blocked: true,
        remaining: 0,
        lockoutMinutes: cfg.lockoutMinutes,
      };
    }
    // Non ancora bloccato — INCR e ritorna il risultato Redis
    const incr = await checkAndIncrLoginRedis(email, ip, cfg.maxAttempts, windowSeconds);
    if (incr.source === "redis") {
      return {
        blocked:        incr.blocked,
        remaining:      incr.remaining,
        lockoutMinutes: cfg.lockoutMinutes,
      };
    }
    // INCR fallita (Redis down tra peek e incr) → cade su DB
  }

  // ── L2: DB fallback ──────────────────────────────────────────────────────
  cleanupOldAttempts();

  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  const [blacklisted] = await db
    .select({ id: ipBlacklist.id })
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ip, ip))
    .limit(1);

  if (blacklisted) {
    return { blocked: true, remaining: 0, lockoutMinutes: cfg.lockoutMinutes };
  }

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
    return { blocked: true, remaining: 0, lockoutMinutes: cfg.lockoutMinutes };
  }

  const globalEmailThreshold = cfg.maxAttempts * 3;
  const [resultByEmail] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        gte(loginAttempts.attemptedAt, windowStart),
        eq(loginAttempts.success, false),
        sql`${loginAttempts.ip} NOT IN (${GENERAL_IP_MARKER}, ${PER_EMAIL_ANY_IP_MARKER})`,
      ),
    );

  const totalByEmail = resultByEmail?.total ?? 0;
  const remaining = Math.max(
    0,
    Math.min(
      cfg.maxAttempts     - totalByEmailIp,
      globalEmailThreshold - totalByEmail,
    ),
  );

  return {
    blocked:        totalByEmail >= globalEmailThreshold,
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
// checkSignupRateLimit — DUAL LAYER
// ---------------------------------------------------------------------------

const SIGNUP_MAX_MULTIPLIER = 2;

export async function checkSignupRateLimit(
  ip: string,
): Promise<{ blocked: boolean; remaining: number }> {
  const cfg = await getBruteforceConfig();
  const windowSeconds  = cfg.windowMinutes * 60;
  const signupMax      = cfg.maxAttempts * SIGNUP_MAX_MULTIPLIER;

  // ── L1: Redis ────────────────────────────────────────────────────────────
  const result = await checkAndIncrSignupRedis(ip, cfg.maxAttempts, windowSeconds);
  if (result.source === "redis") {
    return { blocked: result.blocked, remaining: result.remaining };
  }

  // ── L2: DB fallback ──────────────────────────────────────────────────────
  cleanupOldAttempts();

  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  const [blacklisted] = await db
    .select({ id: ipBlacklist.id })
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ip, ip))
    .limit(1);

  if (blacklisted) return { blocked: true, remaining: 0 };

  const [result2] = await db
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

  const total = result2?.total ?? 0;
  return {
    blocked:   total >= signupMax,
    remaining: Math.max(0, signupMax - total),
  };
}

export async function recordSignupAttempt(ip: string): Promise<void> {
  await db
    .insert(loginAttempts)
    .values({ email: SIGNUP_EMAIL_MARKER, ip, success: false });
}

// ---------------------------------------------------------------------------
// Rate limit generico (invariato)
// ---------------------------------------------------------------------------
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
    blocked:   total >= maxAttempts,
    remaining: Math.max(0, maxAttempts - total),
  };
}

export async function recordGeneralAttempt(key: string): Promise<void> {
  await db
    .insert(loginAttempts)
    .values({ email: key, ip: GENERAL_IP_MARKER, success: false });
}

// ---------------------------------------------------------------------------
// Queries admin — usate dalla dashboard bruteforce
// ---------------------------------------------------------------------------

export type BruteforceEntry = {
  ip: string;
  email: string;
  attempts: number;
  lastAttempt: Date;
  isBlacklisted: boolean;
};

export async function getTopOffenders(limit = 50): Promise<BruteforceEntry[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      ip:          loginAttempts.ip,
      email:       loginAttempts.email,
      attempts:    count(),
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

  const internalMarkers = new Set([
    GENERAL_IP_MARKER,
    SIGNUP_EMAIL_MARKER,
    PER_EMAIL_ANY_IP_MARKER,
  ]);

  return rows
    .filter((r) => r.ip !== GENERAL_IP_MARKER && !internalMarkers.has(r.email))
    .map((r) => ({
      ip:            r.ip,
      email:         r.email,
      attempts:      r.attempts,
      lastAttempt:   r.lastAttempt,
      isBlacklisted: blacklistedIps.has(r.ip),
    }));
}

/**
 * Sblocca un IP: cancella da Redis (L1) e da DB (L2).
 */
export async function unblockIp(ip: string): Promise<void> {
  // Redis prima (fire-and-forget, non blocca se fallisce)
  void unblockIpRedis(ip).catch((err: unknown) => {
    console.error("[unblockIp] Redis unblock failed:", err);
  });

  // DB: cancella tutta la storia fallita dell'IP
  await db
    .delete(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.success, false),
      ),
    );
}

export async function blacklistIp(ip: string, reason?: string): Promise<void> {
  await db
    .insert(ipBlacklist)
    .values({ ip, reason: reason ?? null })
    .onConflictDoNothing();
}

export async function removeFromBlacklist(ip: string): Promise<void> {
  await db.delete(ipBlacklist).where(eq(ipBlacklist.ip, ip));
}

export async function getBlacklist() {
  return db.select().from(ipBlacklist).orderBy(desc(ipBlacklist.createdAt));
}
