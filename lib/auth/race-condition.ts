// lib/auth/race-condition.ts
import "server-only";

/**
 * Postgres error code for UNIQUE constraint violation.
 * Thrown by Supabase/Drizzle when two concurrent inserts
 * collide on the same email or username.
 */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Detects a PostgreSQL UNIQUE constraint violation.
 *
 * Works with both raw pg errors and Drizzle-wrapped errors,
 * which surface the code either at the top level or inside `cause`.
 *
 * @example
 * try {
 *   await db.insert(users).values({ email, ... });
 * } catch (err) {
 *   if (isUniqueConstraintError(err)) {
 *     // race condition: another user registered the same email/username
 *   }
 * }
 */
export function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const e = err as Record<string, unknown>;

  // Direct Postgres error (pg / postgres.js)
  if (e["code"] === PG_UNIQUE_VIOLATION) return true;

  // Drizzle wraps the original error inside `cause`
  if (
    e["cause"] &&
    typeof e["cause"] === "object" &&
    (e["cause"] as Record<string, unknown>)["code"] === PG_UNIQUE_VIOLATION
  ) {
    return true;
  }

  // Supabase REST client surfaces the code inside `details` or `message`
  const message =
    typeof e["message"] === "string" ? e["message"] : "";
  const details =
    typeof e["details"] === "string" ? e["details"] : "";

  return (
    message.includes(PG_UNIQUE_VIOLATION) ||
    details.includes(PG_UNIQUE_VIOLATION) ||
    message.toLowerCase().includes("unique constraint") ||
    details.toLowerCase().includes("unique constraint")
  );
}

/**
 * Maps a unique-constraint error to a human-readable field name
 * so the UI can highlight the correct input.
 *
 * Relies on the constraint name returned by Postgres
 * (e.g. "users_email_unique", "user_profiles_username_unique").
 */
export function resolveConflictField(
  err: unknown
): "email" | "username" | "unknown" {
  if (!err || typeof err !== "object") return "unknown";

  const stringify = JSON.stringify(err).toLowerCase();

  if (stringify.includes("email")) return "email";
  if (stringify.includes("username")) return "username";
  return "unknown";
}
