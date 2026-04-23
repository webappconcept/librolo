// /app/(auth)/sign-up/actions
import {
  addEmailToBloom,
  addUsernameToBloom,
  checkEmailAvailability,
  checkUsernameAvailability,
} from "@/lib/bloom";
import "server-only";

/**
 * Server Action: check if an email is available for registration.
 * Called on-blur from the sign-up form.
 * Returns only { available: boolean } — no sensitive data reaches the client.
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
