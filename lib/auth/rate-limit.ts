// lib/auth/rate-limit.ts
import { db } from "@/lib/db/drizzle";
import { loginAttempts } from "@/lib/db/schema";
import { and, count, eq, gte, lt } from "drizzle-orm";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

// ---------------------------------------------------------------------------
// Cleanup asincrono — fire-and-forget, non blocca la request
// ---------------------------------------------------------------------------
function cleanupOldAttempts(): void {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  void db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, cutoff))
    .catch(() => {
      // silenzioso: il cleanup è best-effort
    });
}

// ---------------------------------------------------------------------------
// Rate limit per login (email + IP) — basato su DB
// ---------------------------------------------------------------------------
export async function checkRateLimit(
  email: string,
  ip: string,
): Promise<{ blocked: boolean; remaining: number }> {
  // Cleanup fire-and-forget: non blocca il controllo
  cleanupOldAttempts();

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

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
    blocked: total >= MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - total),
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
// Rate limit generico — basato su DB, serverless-safe
//
// Usa la tabella loginAttempts con la convenzione:
//   email  = key (es. "otp:userId123", "reset:email@example.com")
//   ip     = "__general__" (marker per distinguere da login reali)
//
// TODO: valutare migrazione a tabella dedicata `general_rate_limits`
// se il volume di eventi aumenta o servono TTL diversi per tipo.
// ---------------------------------------------------------------------------
const GENERAL_IP_MARKER = "__general__";

export async function checkGeneralRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<{ blocked: boolean; remaining: number }> {
  // Cleanup fire-and-forget
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

/**
 * Registra un evento per il rate limit generico.
 * Chiamare DOPO checkGeneralRateLimit quando l'azione viene eseguita.
 *
 * @example
 * const limit = await checkGeneralRateLimit(`otp:${userId}`, 3, 300);
 * if (limit.blocked) return { error: 'Troppi tentativi.' };
 * await recordGeneralAttempt(`otp:${userId}`);
 */
export async function recordGeneralAttempt(key: string): Promise<void> {
  await db
    .insert(loginAttempts)
    .values({ email: key, ip: GENERAL_IP_MARKER, success: false });
}
