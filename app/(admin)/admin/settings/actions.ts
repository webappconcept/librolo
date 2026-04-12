"use server";

import { updateAppSetting } from "@/lib/db/settings-queries";
import { db } from "@/lib/db/drizzle";
import { siteSnippets } from "@/lib/db/schema";
import type { SiteSnippet } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// ActionState (usato dai tab esistenti con useActionState)
// ---------------------------------------------------------------------------
export type ActionState =
  | {}
  | { success: string; timestamp: number }
  | { error: string; timestamp: number };

// ---------------------------------------------------------------------------
// Generale  (general-tab.tsx → saveAppSettings)
// ---------------------------------------------------------------------------
export async function saveAppSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const domain = (formData.get("app_domain") as string ?? "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "");

    await updateAppSetting("app_name", formData.get("app_name") as string);
    await updateAppSetting("app_description", formData.get("app_description") as string);
    await updateAppSetting("app_domain", domain ? `https://${domain}` : "");
    return { success: "Impostazioni salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Comportamento  (behaviour-tab.tsx → saveBehaviourSettings)
// ---------------------------------------------------------------------------
export async function saveBehaviourSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateAppSetting(
      "registrations_enabled",
      formData.get("registrations_enabled") as string,
    );
    await updateAppSetting(
      "maintenance_mode",
      formData.get("maintenance_mode") as string,
    );
    return { success: "Impostazioni comportamento salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Email  (email-tab.tsx → saveEmailSettings)
// ---------------------------------------------------------------------------
export async function saveEmailSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateAppSetting("resend_api_key", formData.get("resend_api_key") as string);
    await updateAppSetting("email_from_name", formData.get("email_from_name") as string);
    await updateAppSetting("email_from_address", formData.get("email_from_address") as string);
    return { success: "Impostazioni email salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Utenti  (users-tab.tsx → saveUsersSettings)
// ---------------------------------------------------------------------------
export async function saveUsersSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateAppSetting(
      "default_role",
      formData.get("default_role") as string,
    );
    return { success: "Impostazioni utenti salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Alias con suffisso Action (compatibilità)
// ---------------------------------------------------------------------------
export const saveGeneralSettingsAction = saveAppSettings;
export const saveBehaviourSettingsAction = saveBehaviourSettings;
export const saveEmailSettingsAction = saveEmailSettings;
export const saveUsersSettingsAction = saveUsersSettings;

// ---------------------------------------------------------------------------
// Snippets CRUD
// ---------------------------------------------------------------------------

/** Invalida la cache degli snippet su tutte le pagine frontend. */
function invalidateSnippets() {
  revalidatePath("/", "layout");
}

export async function createSnippetAction(
  data: Omit<SiteSnippet, "id" | "createdAt" | "updatedAt">,
) {
  await db.insert(siteSnippets).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  invalidateSnippets();
}

export async function updateSnippetAction(
  id: number,
  data: Omit<SiteSnippet, "id" | "createdAt" | "updatedAt">,
) {
  await db
    .update(siteSnippets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(siteSnippets.id, id));
  invalidateSnippets();
}

export async function deleteSnippetAction(id: number) {
  await db.delete(siteSnippets).where(eq(siteSnippets.id, id));
  invalidateSnippets();
}

export async function toggleSnippetAction(id: number, isActive: boolean) {
  await db
    .update(siteSnippets)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(siteSnippets.id, id));
  invalidateSnippets();
}
