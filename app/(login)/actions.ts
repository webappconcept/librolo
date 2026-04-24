// /app/(login)/actions.ts

"use server";

import { isDomainBlacklisted, isIpBlacklisted } from "@/lib/auth/blacklist";
import {
  validatedAction,
  validatedActionWithUser,
} from "@/lib/auth/middleware";
import { createVerificationCode } from "@/lib/auth/otp";
import {
  isUniqueConstraintError,
  resolveConflictField,
} from "@/lib/auth/race-condition";
import { checkRateLimit, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { comparePasswords, hashPassword, setSession } from "@/lib/auth/session";
import {
  addEmailToBloom,
  addUsernameToBloom,
  checkEmailAvailability,
  checkUsernameAvailability,
  ensureBloomFilter,
} from "@/lib/bloom/bloom-filter";
import { db } from "@/lib/db/drizzle";
import { getConsentVersions } from "@/lib/db/pages-queries";
import { getUser } from "@/lib/db/queries";
import {
  activityLogs,
  ActivityType,
  userProfiles,
  users,
  type NewActivityLog,
} from "@/lib/db/schema";
import { getAppSettings } from "@/lib/db/settings-queries";
import { sendSignupVerificationEmail } from "@/lib/email/templates/signup-verification";
import { eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

async function logActivity(
  userId: string,
  type: ActivityType,
  ipAddress?: string,
) {
  const newActivity: NewActivityLog = {
    userId,
    action: type,
    ipAddress: ipAddress || "",
  };
  await db.insert(activityLogs).values(newActivity);
}

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.email().min(3).max(255),
  password: z.string().min(8).max(30),
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const { blocked } = await checkRateLimit(email, ip);
  if (blocked) {
    return {
      error: "Troppi tentativi falliti. Riprova tra 15 minuti.",
      email,
      password,
    };
  }

  const [foundUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!foundUser) {
    await recordLoginAttempt(email, ip, false);
    return { error: "Email o password errate, riprova.", email, password };
  }

  if (foundUser.bannedAt !== null) {
    return {
      error: "Il tuo account è stato sospeso. Contatta il supporto.",
      email,
      password,
    };
  }

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash,
  );

  if (!isPasswordValid) {
    await recordLoginAttempt(email, ip, false);
    return { error: "Email o password errate, riprova.", email, password };
  }

  if (foundUser.role !== "admin") {
    const settings = await getAppSettings();
    if (settings.maintenance_mode === "true") {
      return {
        error:
          "Il sito è in manutenzione. Solo gli amministratori possono accedere.",
        email,
        password,
      };
    }
  }

  await recordLoginAttempt(email, ip, true);
  await Promise.all([
    setSession(foundUser),
    logActivity(foundUser.id, ActivityType.SIGN_IN),
  ]);

  redirect(foundUser.role === "admin" ? "/admin" : "/");
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

const signUpSchema = z
  .object({
    firstName: z.string().min(1, "Il nome è obbligatorio").max(100),
    lastName: z.string().min(1, "Il cognome è obbligatorio").max(100),
    username: z
      .string()
      .min(3, "Username minimo 3 caratteri")
      .max(50, "Username massimo 50 caratteri")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo lettere, numeri e underscore (_)"),
    email: z.email("Email non valida"),
    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri")
      .max(30)
      .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
      .regex(/[0-9]/, "La password deve contenere almeno un numero"),
    confirmPassword: z.string().min(8).max(30),
    acceptTerms: z.string(),
    acceptPrivacy: z.string(),
    acceptMarketing: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non sono uguali",
    path: ["confirmPassword"],
  })
  .refine((data) => data.acceptTerms === "on", {
    message: "Devi accettare i Termini e Condizioni per procedere",
    path: ["acceptTerms"],
  })
  .refine((data) => data.acceptPrivacy === "on", {
    message: "Devi accettare la Privacy Policy per procedere",
    path: ["acceptPrivacy"],
  });

export const signUp = validatedAction(signUpSchema, async (data) => {
  const { firstName, lastName, username, email, password } = data;

  const settings = await getAppSettings();
  if (settings.registrations_enabled === "false") {
    return {
      error: "Le registrazioni sono temporaneamente chiuse.",
      email,
      password,
    };
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  if (await isIpBlacklisted(ip)) {
    return { error: "Accesso non consentito.", email, password };
  }

  if (await isDomainBlacklisted(email)) {
    return { error: "Questo dominio email non è accettato.", email, password };
  }

  // ── Check ottimistici pre-insert (Bloom + DB) ───────────────────────────
  // Riducono i round-trip nel caso normale ma NON sono il gate atomico finale.
  // La protezione definitiva è il vincolo UNIQUE del DB gestito nel catch sotto.
  await ensureBloomFilter();
  const emailAvailability = await checkEmailAvailability(email);
  if (!emailAvailability.available) {
    return { error: "Questa email è già stata registrata", email, password };
  }

  const existingUsername = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.username, username))
    .limit(1);

  if (existingUsername.length > 0) {
    return { error: "Questo username è già in uso.", email, password };
  }

  const { termsVersion, privacyVersion, marketingVersion } =
    await getConsentVersions();

  const passwordHash = await hashPassword(password);
  const defaultRole = settings.default_role || "member";
  const now = new Date();

  // ── INSERT atomico — unico gate reale contro le race condition ──────────
  let createdUser: typeof users.$inferSelect;

  try {
    const [inserted] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: defaultRole,
        acceptedTermsAt: now,
        acceptedTermsVersion: termsVersion,
        acceptedPrivacyAt: now,
        acceptedPrivacyVersion: privacyVersion,
        acceptedMarketingAt: data.acceptMarketing === "on" ? now : null,
        acceptedMarketingVersion:
          data.acceptMarketing === "on" ? marketingVersion : null,
      })
      .returning();

    if (!inserted) {
      return {
        error: "Impossibile creare l'account. Riprova.",
        email,
        password,
      };
    }

    createdUser = inserted;
  } catch (err: unknown) {
    // Race condition su email: un altro utente ha completato la registrazione
    // con la stessa email nell'intervallo tra il check Bloom e questo INSERT.
    if (isUniqueConstraintError(err)) {
      return {
        error:
          "Questa email è appena stata registrata da un altro utente. Prova con un'altra.",
        email,
        password,
      };
    }
    throw err;
  }

  try {
    await db.insert(userProfiles).values({
      userId: createdUser.id,
      firstName,
      lastName,
      username,
    });
  } catch (err: unknown) {
    // Race condition su username: un altro utente ha scelto lo stesso username
    // nell'intervallo tra il check DB pre-insert e questo INSERT.
    if (isUniqueConstraintError(err)) {
      // Rollback manuale: elimina l'utente appena creato per non lasciare
      // un record orfano nella tabella users senza profilo.
      await db.delete(users).where(eq(users.id, createdUser.id));
      return {
        error:
          "Questo username è appena stato scelto da un altro utente. Scegline un altro.",
        email,
        password,
      };
    }
    throw err;
  }

  // ── Sync Bloom — solo dopo entrambi gli INSERT confermati ───────────────
  await addEmailToBloom(createdUser.email);
  await addUsernameToBloom(username);

  const code = await createVerificationCode(createdUser.id);

  // L'invio email non deve bloccare la registrazione:
  // se Resend non è configurato o c'è un errore di rete, l'utente
  // arriva comunque a /verify-email dove può richiedere un nuovo codice.
  try {
    await sendSignupVerificationEmail(createdUser.email, code, firstName);
  } catch (emailErr) {
    console.error("[signUp] sendSignupVerificationEmail failed:", emailErr);
  }

  await logActivity(createdUser.id, ActivityType.SIGN_UP);

  (await cookies()).set("pending_verification_user_id", createdUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 20,
    path: "/",
  });

  redirect("/verify-email");
});

export async function checkEmailAction(email: string) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { blocked } = await checkRateLimit(email, ip);
  if (blocked)
    return {
      available: false,
      error: "Troppi tentativi, riprova tra qualche minuto.",
    };

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { available: false, error: "Inserisci un indirizzo email" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { available: false, error: "Inserisci un indirizzo email valido" };
  }

  await ensureBloomFilter();
  const result = await checkEmailAvailability(normalizedEmail);

  return {
    available: result.available,
    checkedViaDb: result.checkedViaDb,
    error: result.available ? "" : "Questa email è già stata registrata",
  };
}

/**
 * Server Action: controlla se lo username è disponibile.
 */
export async function checkUsernameAction(
  username: string,
): Promise<{ available: boolean; error?: string }> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { blocked } = await checkRateLimit(username, ip);
  if (blocked)
    return {
      available: false,
      error: "Troppi tentativi, riprova tra qualche minuto.",
    };

  if (!username || username.length < 3) {
    return { available: false };
  }

  const result = await checkUsernameAvailability(username);
  return {
    available: result.available,
    error: result.available ? undefined : "Questo username è già in uso.",
  };
}

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

export async function signOut() {
  const user = await getUser();
  if (user) await logActivity(user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete("session");
  redirect("/sign-in");
}

// ---------------------------------------------------------------------------
// updatePassword
// ---------------------------------------------------------------------------

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: "Current password is incorrect.",
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: "New password must be different from the current password.",
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: "New password and confirmation password do not match.",
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(user.id, ActivityType.UPDATE_PASSWORD),
    ]);

    return { success: "Password updated successfully." };
  },
);

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: "Incorrect password. Account deletion failed.",
      };
    }

    await logActivity(user.id, ActivityType.DELETE_ACCOUNT);
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`,
      })
      .where(eq(users.id, user.id));

    (await cookies()).delete("session");
    redirect("/sign-in");
  },
);

// ---------------------------------------------------------------------------
// updateAccount
// ---------------------------------------------------------------------------

const updateAccountSchema = z.object({
  firstName: z.string().min(1, "Il nome è richiesto").max(100),
  lastName: z.string().min(1, "Il cognome è richiesto").max(100),
  email: z.string().email("Email non valida"),
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { firstName, lastName, email } = data;

    await Promise.all([
      db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, user.id)),
      db
        .insert(userProfiles)
        .values({ userId: user.id, firstName, lastName })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: { firstName, lastName, updatedAt: new Date() },
        }),
      logActivity(user.id, ActivityType.UPDATE_ACCOUNT),
    ]);

    return { firstName, success: "Account updated successfully." };
  },
);
