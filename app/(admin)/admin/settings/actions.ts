"use server";

import { updateAppSetting } from "@/lib/db/settings-queries";
import { db } from "@/lib/db/drizzle";
import { siteSnippets, disposableDomains } from "@/lib/db/schema";
import type { SiteSnippet } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// ActionState
// ---------------------------------------------------------------------------
export type ActionState =
  | {}
  | { success: string; timestamp: number }
  | { error: string; timestamp: number };

// ---------------------------------------------------------------------------
// Generale
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
// Comportamento
// ---------------------------------------------------------------------------
export async function saveBehaviourSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateAppSetting("registrations_enabled", formData.get("registrations_enabled") as string);
    await updateAppSetting("maintenance_mode", formData.get("maintenance_mode") as string);
    revalidatePath("/admin/settings");
    return { success: "Impostazioni comportamento salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Sender
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

export const saveEmailSettings = saveSenderSettings;

// ---------------------------------------------------------------------------
// Email Templates
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
// Utenti / SignIn
// ---------------------------------------------------------------------------
export async function saveUsersSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await updateAppSetting("default_role", formData.get("default_role") as string);
    revalidatePath("/admin/settings");
    return { success: "Impostazioni utenti salvate.", timestamp: Date.now() };
  } catch {
    return { error: "Errore durante il salvataggio.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Redis / Upstash
// ---------------------------------------------------------------------------
export async function saveRedisSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const url = (formData.get('upstash_redis_rest_url') as string ?? '').trim()
    const token = (formData.get('upstash_redis_rest_token') as string ?? '').trim()
    await updateAppSetting('upstash_redis_rest_url', url || null)
    await updateAppSetting('upstash_redis_rest_token', token || null)
    revalidatePath('/admin/settings')
    return { success: 'Credenziali Redis salvate.', timestamp: Date.now() }
  } catch {
    return { error: 'Errore durante il salvataggio.', timestamp: Date.now() }
  }
}

// ---------------------------------------------------------------------------
// Domini bloccati (disposable_domains)
// ---------------------------------------------------------------------------
export async function addDisposableDomainAction(
  domain: string,
): Promise<ActionState> {
  try {
    const clean = domain.trim().toLowerCase();
    if (!clean) return { error: "Dominio non valido.", timestamp: Date.now() };
    await db
      .insert(disposableDomains)
      .values({ domain: clean })
      .onConflictDoNothing();
    revalidatePath("/admin/settings");
    return { success: `"${clean}" aggiunto.`, timestamp: Date.now() };
  } catch {
    return { error: "Errore durante l'aggiunta.", timestamp: Date.now() };
  }
}

export async function removeDisposableDomainAction(
  domain: string,
): Promise<ActionState> {
  try {
    await db
      .delete(disposableDomains)
      .where(eq(disposableDomains.domain, domain.trim().toLowerCase()));
    revalidatePath("/admin/settings");
    return { success: `"${domain}" rimosso.`, timestamp: Date.now() };
  } catch {
    return { error: "Errore durante la rimozione.", timestamp: Date.now() };
  }
}

export async function bulkImportDisposableDomainsAction(
  domains: string[],
): Promise<ActionState> {
  try {
    if (domains.length === 0)
      return { error: "Nessun dominio da importare.", timestamp: Date.now() };
    const values = domains
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
      .map((domain) => ({ domain }));
    await db
      .insert(disposableDomains)
      .values(values)
      .onConflictDoNothing();
    revalidatePath("/admin/settings");
    return {
      success: `${values.length} domini importati con successo.`,
      timestamp: Date.now(),
    };
  } catch {
    return { error: "Errore durante l'importazione bulk.", timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Alias retrocompatibilità
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
