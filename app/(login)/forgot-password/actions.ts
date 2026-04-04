// app/(login)/forgot-password/actions.ts
"use server";

import { validatedAction } from "@/lib/auth/middleware";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email/templates/password-reset";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.email("Inserisci un indirizzo email valido"),
});

export const forgotPassword = validatedAction(
  forgotPasswordSchema,
  async (data) => {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for") ??
      headersList.get("x-real-ip") ??
      "unknown";
    // Max 3 richieste per IP ogni 15 minuti
    const { blocked } = checkGeneralRateLimit(
      `forgot-password:${ip}`,
      3,
      15 * 60,
    );

    if (blocked) {
      return { error: "Troppe richieste. Riprova tra qualche minuto." };
    }

    const { email } = data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Risposta generica per non rivelare se l'email esiste
    if (!user) {
      return {
        success: "Se l'email è registrata, riceverai le istruzioni a breve.",
      };
    }

    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, token, user.name ?? undefined);

    return {
      success: "Se l'email è registrata, riceverai le istruzioni a breve.",
    };
  },
);
