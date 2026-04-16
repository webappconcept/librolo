"use server";

import { isDomainBlacklisted, isIpBlacklisted } from "@/lib/auth/blacklist";
import {
  validatedAction,
  validatedActionWithUser,
} from "@/lib/auth/middleware";
import { createVerificationCode } from "@/lib/auth/otp";
import { checkRateLimit, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { comparePasswords, hashPassword, setSession } from "@/lib/auth/session";
import { db } from "@/lib/db/drizzle";
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

const signUpSchema = z
  .object({
    firstName: z.string().min(1, "Il nome è obbligatorio").max(100),
    lastName: z.string().min(1, "Il cognome è obbligatorio").max(100),
    email: z.email(),
    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri")
      .max(30)
      .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
      .regex(/[0-9]/, "La password deve contenere almeno un numero"),
    confirmPassword: z.string().min(8).max(30),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non sono uguali",
    path: ["confirmPassword"],
  });

export const signUp = validatedAction(signUpSchema, async (data) => {
  const { firstName, lastName, email, password } = data;

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

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { error: "Questa email è già stata registrata", email, password };
  }

  const passwordHash = await hashPassword(password);
  const defaultRole = settings.default_role || "member";

  const [createdUser] = await db
    .insert(users)
    .values({ email, passwordHash, role: defaultRole })
    .returning();

  if (!createdUser) {
    return {
      error: "Failed to create user. Please try again.",
      email,
      password,
    };
  }

  // Crea profilo separato
  await db.insert(userProfiles).values({
    userId: createdUser.id,
    firstName,
    lastName,
  });

  const code = await createVerificationCode(createdUser.id);
  await sendSignupVerificationEmail(createdUser.email, code, firstName);
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

export async function signOut() {
  const user = await getUser();
  if (user) await logActivity(user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete("session");
  redirect("/sign-in");
}

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

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return { password, error: "Incorrect password. Account deletion failed." };
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

const updateAccountSchema = z.object({
  firstName: z.string().min(1, "Il nome è richiesto").max(100),
  lastName: z.string().min(1, "Il cognome è richiesto").max(100),
  email: z.email("Email non valida"),
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { firstName, lastName, email } = data;

    await Promise.all([
      // email rimane su users
      db.update(users).set({ email, updatedAt: new Date() }).where(eq(users.id, user.id)),
      // nome/cognome su user_profiles (upsert)
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
