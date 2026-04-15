// lib/auth/otp.ts
import { db } from "@/lib/db/drizzle";
import { emailVerifications } from "@/lib/db/schema";
import { randomInt } from "crypto";
import { eq } from "drizzle-orm";

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999)); // 6 cifre sicure
}

export async function createVerificationCode(userId: string): Promise<string> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti

  // Rimuovi eventuali codici precedenti
  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.userId, userId));

  await db.insert(emailVerifications).values({ userId, code, expiresAt });
  return code;
}

export async function verifyOtpCode(
  userId: string,
  inputCode: string,
): Promise<{ success: boolean; error?: string }> {
  const [record] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.userId, userId))
    .limit(1);

  if (!record) return { success: false, error: "Codice non trovato." };
  if (new Date() > record.expiresAt)
    return { success: false, error: "Codice scaduto." };
  if (record.code !== inputCode)
    return { success: false, error: "Codice non corretto." };

  // Codice valido → elimina il record
  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.userId, userId));
  return { success: true };
}
