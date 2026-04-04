import { db } from "@/lib/db/drizzle";
import { loginAttempts } from "@/lib/db/schema";
import { and, count, eq, gte, lt } from "drizzle-orm";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function checkRateLimit(
  email: string,
  ip: string,
): Promise<{ blocked: boolean; remaining: number }> {
  // Pulisci record più vecchi di 24 ore
  await db
    .delete(loginAttempts)
    .where(
      lt(loginAttempts.attemptedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
    );

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
) {
  await db.insert(loginAttempts).values({ email, ip, success });
}
