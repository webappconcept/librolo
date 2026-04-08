"use server";

import { getUser } from "@/lib/db/queries";
import { updateAppSetting, type SettingKey } from "@/lib/db/settings-queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionState =
  | { success: string; error?: undefined; timestamp: number }
  | { error: string; success?: undefined; timestamp: number }
  | {};

async function requireAdmin() {
  const user = await getUser();
  if (!user || user.role !== "admin") redirect("/");
  return user;
}

/** Normalizza il dominio: rimuove protocollo e slash finale. */
function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

export async function saveAppSettings(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();

    const fields: SettingKey[] = [
      "app_name",
      "app_description",
      "app_domain",
      "maintenance_mode",
      "registrations_enabled",
    ];

    await Promise.all(
      fields.map((key) => {
        const value = formData.get(key);
        if (typeof value === "string") {
          // Il dominio viene sempre normalizzato (senza protocollo)
          const cleaned = key === "app_domain" ? normalizeDomain(value) : value.trim();
          return updateAppSetting(key, cleaned);
        }
      }),
    );

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return {
      success: "Impostazioni salvate con successo",
      timestamp: Date.now(),
    };
  } catch {
    return {
      error: "Errore durante il salvataggio. Riprova.",
      timestamp: Date.now(),
    };
  }
}

export async function saveEmailSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();

    const fields: SettingKey[] = [
      "resend_api_key",
      "email_from_name",
      "email_from_address",
    ];

    await Promise.all(
      fields.map((key) => {
        const value = formData.get(key);
        if (typeof value === "string" && value.trim()) {
          return updateAppSetting(key, value.trim());
        }
      }),
    );

    revalidatePath("/admin/settings");
    return { success: "Impostazioni email salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}
