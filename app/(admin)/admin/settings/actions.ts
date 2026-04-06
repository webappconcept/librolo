// app/(admin)/admin/settings/actions.ts
"use server";

import { getUser } from "@/lib/db/queries";
import { updateAppSetting, type SettingKey } from "@/lib/db/settings-queries";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const user = await getUser();
  if (!user || user.role !== "admin") redirect("/");
  return user;
}

export async function saveAppSettings(formData: FormData) {
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
}
