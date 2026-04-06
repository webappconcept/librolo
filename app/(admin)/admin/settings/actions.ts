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

export async function saveAppSettings(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();

    const fields: SettingKey[] = [
      "app_name",
      "app_description",
      "maintenance_mode",
      "registrations_enabled",
    ];

    await Promise.all(
      fields.map((key) => {
        const value = formData.get(key);
        if (typeof value === "string") {
          return updateAppSetting(key, value.trim());
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
