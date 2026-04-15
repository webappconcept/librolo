// lib/auth/password-reset.ts
import { db } from "@/lib/db/drizzle";
import { passwordResetTokens } from "@/lib/db/schema";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  const token = randomBytes(32).toString("hex"); // 64 char hex
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minuti

  // Rimuovi token precedenti
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  return token;
}

export async function verifyPasswordResetToken(
  token: string,
): Promise<{ valid: false; error: string } | { valid: true; userId: string }> {
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  if (!record) return { valid: false, error: "Link non valido." };
  if (new Date() > record.expiresAt)
    return { valid: false, error: "Link scaduto. Richiedine uno nuovo." };

  return { valid: true, userId: record.userId };
}

export async function deletePasswordResetToken(token: string): Promise<void> {
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token));
}
