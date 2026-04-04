// app/(login)/forgot-password/actions.ts
"use server";

import { validatedAction } from "@/lib/auth/middleware";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email/templates/password-reset";
import { eq } from "drizzle-orm";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.email("Inserisci un indirizzo email valido"),
});

export const forgotPassword = validatedAction(
  forgotPasswordSchema,
  async (data) => {
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
