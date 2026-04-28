// lib/auth/username-validator.ts
//
// Validazione del formato di uno username.
// Singola sorgente di verità usata dal form sign-up (Zod), dalla validazione
// client di login.tsx, dal wizard di onboarding e dalle relative server action.
//
// Regole:
//   - 3-50 caratteri (vincolo applicato dai caller, qui lo si può solo testare)
//   - lettere, numeri, punto (.) e underscore (_)
//   - il punto non può stare all'inizio, alla fine, né essere consecutivo

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 50;
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;

export type UsernameValidation = { ok: true } | { ok: false; error: string };

/**
 * Valida solo il *formato* (caratteri ammessi e regole sui punti),
 * NON la lunghezza: in Zod la lunghezza si esprime con .min()/.max() per
 * avere errori path-aware, e nei client component si controlla a parte.
 *
 * Ritorna sempre il primo errore, ordinato dal più generico al più specifico.
 */
export function validateUsernameFormat(input: string): UsernameValidation {
  if (!USERNAME_REGEX.test(input)) {
    return {
      ok: false,
      error: "Solo lettere, numeri, punto (.) e underscore (_)",
    };
  }
  if (input.startsWith(".") || input.endsWith(".")) {
    return {
      ok: false,
      error: "Il punto non può essere all'inizio o alla fine",
    };
  }
  if (input.includes("..")) {
    return { ok: false, error: "Il punto non può essere consecutivo" };
  }
  return { ok: true };
}
