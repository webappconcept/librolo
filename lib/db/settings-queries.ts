// lib/db/settings-queries.ts
import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

// Chiavi note — type safety
export type SettingKey =
  | "app_name"
  | "app_description"
  | "maintenance_mode"
  | "registrations_enabled";

export type AppSettings = Record<SettingKey, string>;

// Valori di fallback se la tabella è vuota
const DEFAULTS: AppSettings = {
  app_name: "Librolo",
  app_description: "La tua libreria digitale",
  maintenance_mode: "false",
  registrations_enabled: "true",
};

// Cached — una sola query per render
async function fetchAppSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings);
  const result = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in result) {
      result[row.key as SettingKey] =
        row.value ?? DEFAULTS[row.key as SettingKey];
    }
  }
  return result;
}

export const getAppSettings = cache(fetchAppSettings);

// Aggiorna una singola impostazione
export async function updateAppSetting(key: SettingKey, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
