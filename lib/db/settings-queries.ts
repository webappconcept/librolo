// lib/db/settings-queries.ts
import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { cache } from "react";

export type SettingKey =
  | "app_name"
  | "app_description"
  | "app_domain"
  | "maintenance_mode"
  | "registrations_enabled"
  | "default_role"
  | "resend_api_key"
  | "email_from_name"
  | "email_from_address"
  // Welcome email
  | "email_welcome_subject"
  | "email_welcome_bcc"
  | "email_welcome_body"
  | "email_welcome_footer"
  // Signup verification
  | "email_signup_subject"
  | "email_signup_bcc"
  | "email_signup_body"
  | "email_signup_footer"
  // Password reset
  | "email_reset_subject"
  | "email_reset_bcc"
  | "email_reset_body"
  | "email_reset_footer"
  // User deleted
  | "email_deleted_subject"
  | "email_deleted_bcc"
  | "email_deleted_body"
  | "email_deleted_footer"
  // SEO
  | "robots_txt"
  | "humans_txt"
  // Bruteforce
  | "bf_max_attempts"
  | "bf_window_minutes"
  | "bf_lockout_minutes"
  | "bf_alert_threshold";

export type AppSettings = {
  app_name: string;
  app_description: string;
  app_domain: string;
  maintenance_mode: string;
  registrations_enabled: string;
  default_role: string;
  resend_api_key: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  email_welcome_subject: string | null;
  email_welcome_bcc: string | null;
  email_welcome_body: string | null;
  email_welcome_footer: string | null;
  email_signup_subject: string | null;
  email_signup_bcc: string | null;
  email_signup_body: string | null;
  email_signup_footer: string | null;
  email_reset_subject: string | null;
  email_reset_bcc: string | null;
  email_reset_body: string | null;
  email_reset_footer: string | null;
  email_deleted_subject: string | null;
  email_deleted_bcc: string | null;
  email_deleted_body: string | null;
  email_deleted_footer: string | null;
  robots_txt: string | null;
  humans_txt: string | null;
  // Bruteforce
  bf_max_attempts: string;
  bf_window_minutes: string;
  bf_lockout_minutes: string;
  bf_alert_threshold: string;
};

const DEFAULTS: AppSettings = {
  app_name: "Nome dell'app",
  app_description: "Descrizione dell'app",
  app_domain: "",
  maintenance_mode: "false",
  registrations_enabled: "true",
  default_role: "member",
  resend_api_key: null,
  email_from_name: null,
  email_from_address: null,
  email_welcome_subject: null,
  email_welcome_bcc: null,
  email_welcome_body: null,
  email_welcome_footer: null,
  email_signup_subject: null,
  email_signup_bcc: null,
  email_signup_body: null,
  email_signup_footer: null,
  email_reset_subject: null,
  email_reset_bcc: null,
  email_reset_body: null,
  email_reset_footer: null,
  email_deleted_subject: null,
  email_deleted_bcc: null,
  email_deleted_body: null,
  email_deleted_footer: null,
  robots_txt: null,
  humans_txt: null,
  // Bruteforce defaults
  bf_max_attempts: "5",
  bf_window_minutes: "15",
  bf_lockout_minutes: "30",
  bf_alert_threshold: "20",
};

async function fetchAppSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings);
  const result: AppSettings = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in result && row.value !== null) {
      (result as Record<string, string | null>)[row.key] = row.value;
    }
  }
  return result;
}

export const getAppSettings = cache(fetchAppSettings);

export async function updateAppSetting(key: SettingKey, value: string | null) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
