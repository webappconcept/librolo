"use server";

import { updateAppSetting } from "@/lib/db/settings-queries";
import { db } from "@/lib/db/drizzle";
import { siteSnippets } from "@/lib/db/schema";
import type { SiteSnippet } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

// ─── AppSettings ─────────────────────────────────────────────────────────────
export async function saveGeneralSettingsAction(formData: FormData) {
  await updateAppSetting("app_name", formData.get("app_name") as string);
  await updateAppSetting("app_description", formData.get("app_description") as string);
  await updateAppSetting("app_domain", formData.get("app_domain") as string);
}

export async function saveBehaviourSettingsAction(formData: FormData) {
  await updateAppSetting("maintenance_mode", formData.get("maintenance_mode") as string);
  await updateAppSetting("registrations_enabled", formData.get("registrations_enabled") as string);
}

export async function saveEmailSettingsAction(formData: FormData) {
  await updateAppSetting("resend_api_key", formData.get("resend_api_key") as string);
  await updateAppSetting("email_from_name", formData.get("email_from_name") as string);
  await updateAppSetting("email_from_address", formData.get("email_from_address") as string);
}

// ─── Snippets ─────────────────────────────────────────────────────────────────
function invalidateSnippets() {
  revalidateTag("snippets");
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
