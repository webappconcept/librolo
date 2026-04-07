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
  | "resend_api_key"
  | "email_from_name"
  | "email_from_address";

export type AppSettings = {
  app_name: string;
  app_description: string;
  app_domain: string;
  maintenance_mode: string;
  registrations_enabled: string;
  resend_api_key: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
};

const DEFAULTS: AppSettings = {
  app_name: "Librolo",
  app_description: "La tua libreria digitale",
  app_domain: "",
  maintenance_mode: "false",
  registrations_enabled: "true",
  resend_api_key: null,
  email_from_name: null,
  email_from_address: null,
};

async function fetchAppSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings);
  const result: AppSettings = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in result) {
      (result as Record<string, string | null>)[row.key] = row.value ?? null;
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
