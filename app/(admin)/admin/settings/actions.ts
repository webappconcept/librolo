"use server";

import { updateAppSetting } from "@/lib/db/settings-queries";
import { db } from "@/lib/db/drizzle";
import { siteSnippets } from "@/lib/db/schema";
import type { SiteSnippet } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// ActionState (usato dai tab con useActionState)
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
    revalidatePath("/admin/settings");
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
    revalidatePath("/admin/settings");
    return { success: "Impostazioni comportamento salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Sender  (sender-tab.tsx → saveSenderSettings)
// ---------------------------------------------------------------------------
export async function saveSenderSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateAppSetting("resend_api_key", formData.get("resend_api_key") as string);
    await updateAppSetting("email_from_name", formData.get("email_from_name") as string);
    await updateAppSetting("email_from_address", formData.get("email_from_address") as string);
    revalidatePath("/admin/settings");
    return { success: "Impostazioni mittente salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// Alias retrocompatibilità
export const saveEmailSettings = saveSenderSettings;

// ---------------------------------------------------------------------------
// Email Templates  (email-templates-tab.tsx → saveEmailTemplateSettings)
// ---------------------------------------------------------------------------
export async function saveEmailTemplateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const keys = [
      "email_welcome_subject", "email_welcome_bcc", "email_welcome_body", "email_welcome_footer",
      "email_signup_subject",  "email_signup_bcc",  "email_signup_body",  "email_signup_footer",
      "email_reset_subject",   "email_reset_bcc",   "email_reset_body",   "email_reset_footer",
      "email_deleted_subject", "email_deleted_bcc", "email_deleted_body", "email_deleted_footer",
    ] as const;

    for (const key of keys) {
      const val = (formData.get(key) as string | null) ?? "";
      await updateAppSetting(key, val.trim() || null);
    }
    revalidatePath("/admin/settings");
    return { success: "Template email salvati.", timestamp: Date.now() };
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
    revalidatePath("/admin/settings");
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
export const saveEmailSettingsAction = saveSenderSettings;
export const saveUsersSettingsAction = saveUsersSettings;

// ---------------------------------------------------------------------------
// Snippets CRUD
// ---------------------------------------------------------------------------

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
