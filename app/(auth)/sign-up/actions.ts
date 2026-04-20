import 'server-only'
import { checkEmailAvailability, addEmailToBloom } from '@/lib/bloom'

/**
 * Server Action: check if an email is available for registration.
 * Called on-blur from the sign-up form.
 * Returns only { available: boolean } — no sensitive data reaches the client.
 */
export async function checkEmailAction(
  email: string
): Promise<{ available: boolean }> {
  if (!email || !email.includes('@')) {
    return { available: false }
  }

  const result = await checkEmailAvailability(email)
  return { available: result.available }
}

/**
 * Call this after a successful user registration to keep the Bloom filter in sync.
 * Should be invoked at the end of your sign-up server action.
 */
export async function syncEmailToBloomAction(email: string): Promise<void> {
  await addEmailToBloom(email)
}
