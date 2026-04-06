// lib/email/client.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { Resend } from "resend";

export async function getResendClient() {
  const settings = await getAppSettings();
  const key = settings.resend_api_key || process.env.RESEND_API_KEY;

  if (!key)
    throw new Error(
      "Resend API key non configurata. Vai in Impostazioni → Email.",
    );
  return new Resend(key);
}

export async function getEmailFrom() {
  const settings = await getAppSettings();
  const name = settings.email_from_name || settings.app_name;
  const address =
    settings.email_from_address ||
    process.env.EMAIL_FROM_ADDRESS ||
    "noreply@example.com";
  return `${name} <${address}>`;
}
