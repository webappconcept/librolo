// /app/(auth)/sign-up/actions
import {
  addEmailToBloom,
  addUsernameToBloom,
  checkEmailAvailability,
  checkUsernameAvailability,
} from "@/lib/bloom";
import {
  isUniqueConstraintError,
  resolveConflictField,
} from "@/lib/auth/race-condition";
import "server-only";

/**
 * Server Action: check if an email is available for registration.
 * Called on-blur from the sign-up form.
 * Returns only { available: boolean } — no sensitive data reaches the client.
 *
 * NOTE: this check is an optimistic UX shortcut via Bloom filter.
 * The authoritative uniqueness gate is the DB UNIQUE constraint
 * enforced in registerAction().
 */
export async function checkEmailAction(
  email: string,
): Promise<{ available: boolean }> {
  if (!email || !email.includes("@")) {
    return { available: false };
  }

  const result = await checkEmailAvailability(email);
  return { available: result.available };
}

export async function checkUsernameAction(
  username: string,
): Promise<{ available: boolean }> {
  if (!username || username.length < 3) return { available: false };
  const result = await checkUsernameAvailability(username);
  return { available: result.available };
}

// ─── Tipi di risposta ────────────────────────────────────────────────────────

export type RegisterResult =
  | { success: true }
  | { success: false; error: string; field?: "email" | "username" | "unknown" };

/**
 * Payload atteso dal form di registrazione.
 * Adattalo ai campi reali del tuo schema Drizzle / Supabase.
 */
export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  /** Qualsiasi campo aggiuntivo del tuo form */
  [key: string]: unknown;
}

/**
 * Server Action principale di registrazione.
 *
 * Flusso:
 *  1. Validazione input di base
 *  2. Check Bloom (ottimistico, evita round-trip al DB nella maggior parte dei casi)
 *  3. INSERT su Supabase/Drizzle  ← unico gate atomico reale
 *  4. Se errore 23505 → race condition rilevata → risposta UX specifica
 *  5. Sync Bloom filter solo dopo INSERT confermato
 *
 * TODO: sostituisci il blocco "INSERT" con la tua chiamata reale
 *       a Supabase auth.signUp() o db.insert(users).values(...).
 */
export async function registerAction(
  payload: RegisterPayload,
): Promise<RegisterResult> {
  const { email, username, password } = payload;

  // ── 1. Validazione base ──────────────────────────────────────────────────
  if (!email?.includes("@")) {
    return { success: false, error: "Email non valida.", field: "email" };
  }
  if (!username || username.length < 3) {
    return {
      success: false,
      error: "Username troppo corto (minimo 3 caratteri).",
      field: "username",
    };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Password troppo corta (minimo 8 caratteri)." };
  }

  // ── 2. Check Bloom (ottimizzazione UX, non è il gate finale) ────────────
  const [emailCheck, usernameCheck] = await Promise.all([
    checkEmailAvailability(email),
    checkUsernameAvailability(username),
  ]);

  if (!emailCheck.available) {
    return {
      success: false,
      error: "Questa email è già registrata.",
      field: "email",
    };
  }
  if (!usernameCheck.available) {
    return {
      success: false,
      error: "Questo username non è disponibile.",
      field: "username",
    };
  }

  // ── 3. INSERT su DB (gate atomico — qui avviene la vera verifica) ────────
  //
  // TODO: sostituisci con la tua chiamata reale, per esempio:
  //
  //   const { error } = await supabase.auth.signUp({ email, password });
  //   if (error) throw error;
  //   await db.insert(userProfiles).values({ username, ... });
  //
  // oppure direttamente:
  //
  //   await db.insert(users).values({ email, password: hashedPwd });
  //   await db.insert(userProfiles).values({ username });
  //
  try {
    // ← inserisci qui la tua logica di registrazione
    throw new Error("TODO: implementa la registrazione reale");
  } catch (err: unknown) {
    // ── 4. Race condition: un altro utente ha occupato email/username ────
    if (isUniqueConstraintError(err)) {
      const field = resolveConflictField(err);

      const messages: Record<typeof field, string> = {
        email: "Questa email è appena stata registrata da un altro utente. Prova con un'altra.",
        username: "Questo username è appena stato scelto da un altro utente. Scegline un altro.",
        unknown: "Email o username già in uso. Riprova.",
      };

      return { success: false, error: messages[field], field };
    }

    // Errore imprevisto — rilancia per l'error boundary di Next.js
    throw err;
  }

  // ── 5. Sync Bloom — solo dopo INSERT confermato ──────────────────────────
  await Promise.all([
    syncEmailToBloomAction(email),
    syncUsernameToBloomAction(username),
  ]);

  return { success: true };
}

/**
 * Call this after a successful user registration to keep the Bloom filter in sync.
 * Should be invoked at the end of your sign-up server action.
 */
export async function syncEmailToBloomAction(email: string): Promise<void> {
  await addEmailToBloom(email);
}

/**
 * Sincronizza lo username dopo la registrazione.
 */
export async function syncUsernameToBloomAction(
  username: string,
): Promise<void> {
  await addUsernameToBloom(username);
}
