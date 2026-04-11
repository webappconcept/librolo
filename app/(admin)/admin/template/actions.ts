"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  upsertTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "@/lib/db/template-queries";
import { logContentActivity } from "@/lib/db/content-activity";
import { ActivityType } from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import type { NewPageTemplate, NewTemplateField } from "@/lib/db/schema";

export async function saveTemplateAction(formData: FormData) {
  const id = formData.get("id") ? Number(formData.get("id")) : undefined;
  const name = (formData.get("name") as string).trim();
  const slug = (formData.get("slug") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const isCreating = !id;

  const styleConfig = {
    fontBody: formData.get("fontBody") as string | null,
    fontDisplay: formData.get("fontDisplay") as string | null,
    colorPrimary: formData.get("colorPrimary") as string | null,
    colorBg: formData.get("colorBg") as string | null,
    colorText: formData.get("colorText") as string | null,
    spacing: (formData.get("spacing") as string | null) ?? "normal",
    borderRadius: (formData.get("borderRadius") as string | null) ?? "medium",
  };

  const fieldsJson = formData.get("fieldsJson") as string | null;
  let fields: Omit<NewTemplateField, "templateId">[] = [];
  if (fieldsJson) {
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      // JSON non valido — procedi senza campi
    }
  }

  const templateData: NewPageTemplate = {
    ...(id ? { id } : {}),
    name,
    slug,
    description,
    styleConfig: JSON.stringify(styleConfig),
  };

  await upsertTemplate(templateData, fields);

  // ── Activity log ────────────────────────────────────────────────────────────
  const user = await getUser();
  const detail = `slug: ${slug} | nome: ${name}`;
  await logContentActivity(
    isCreating ? ActivityType.TEMPLATE_CREATED : ActivityType.TEMPLATE_UPDATED,
    detail,
    user?.id ?? null,
  );
  // ────────────────────────────────────────────────────────────────────────────

  revalidatePath("/admin/template");
  redirect("/admin/template");
}

export async function deleteTemplateAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const result = await deleteTemplate(id);
  if (!result.error) {
    revalidatePath("/admin/template");

    // ── Activity log ──────────────────────────────────────────────────────────
    const user = await getUser();
    await logContentActivity(
      ActivityType.TEMPLATE_DELETED,
      `id: ${id}`,
      user?.id ?? null,
    );
    // ──────────────────────────────────────────────────────────────────────────
  }
}

export async function duplicateTemplateAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await duplicateTemplate(id);
  revalidatePath("/admin/template");

  // ── Activity log ────────────────────────────────────────────────────────────
  const user = await getUser();
  await logContentActivity(
    ActivityType.TEMPLATE_CREATED,
    `duplicato da id: ${id}`,
    user?.id ?? null,
  );
  // ────────────────────────────────────────────────────────────────────────────
}
