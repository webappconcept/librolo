import { db } from "@/lib/db/drizzle";
import {
  pageTemplates,
  templateFields,
  type NewPageTemplate,
  type NewTemplateField,
  type PageTemplate,
  type TemplateField,
} from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export type TemplateWithFields = PageTemplate & { fields: TemplateField[] };

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function getAllTemplates(): Promise<TemplateWithFields[]> {
  const templates = await db
    .select()
    .from(pageTemplates)
    .orderBy(asc(pageTemplates.name));

  const allFields = await db
    .select()
    .from(templateFields)
    .orderBy(asc(templateFields.sortOrder));

  return templates.map((t) => ({
    ...t,
    fields: allFields.filter((f) => f.templateId === t.id),
  }));
}

export async function getTemplateById(id: number): Promise<TemplateWithFields | undefined> {
  const [template] = await db
    .select()
    .from(pageTemplates)
    .where(eq(pageTemplates.id, id))
    .limit(1);
  if (!template) return undefined;

  const fields = await db
    .select()
    .from(templateFields)
    .where(eq(templateFields.templateId, id))
    .orderBy(asc(templateFields.sortOrder));

  return { ...template, fields };
}

export async function getTemplateBySlug(slug: string): Promise<TemplateWithFields | undefined> {
  const [template] = await db
    .select()
    .from(pageTemplates)
    .where(eq(pageTemplates.slug, slug))
    .limit(1);
  if (!template) return undefined;

  const fields = await db
    .select()
    .from(templateFields)
    .where(eq(templateFields.templateId, template.id))
    .orderBy(asc(templateFields.sortOrder));

  return { ...template, fields };
}

/**
 * Crea o aggiorna un template con i suoi campi.
 * Strategia: upsert template, poi elimina tutti i campi esistenti e li ricrea.
 */
export async function upsertTemplate(
  data: NewPageTemplate,
  fields: Omit<NewTemplateField, "templateId">[],
): Promise<PageTemplate> {
  let template: PageTemplate;

  if (data.id) {
    await db
      .update(pageTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pageTemplates.id, data.id));
    const [updated] = await db
      .select()
      .from(pageTemplates)
      .where(eq(pageTemplates.id, data.id))
      .limit(1);
    template = updated;
  } else {
    const [inserted] = await db
      .insert(pageTemplates)
      .values(data)
      .returning();
    template = inserted;
  }

  await db.delete(templateFields).where(eq(templateFields.templateId, template.id));

  if (fields.length > 0) {
    await db.insert(templateFields).values(
      fields.map((f, i) => ({
        ...f,
        templateId: template.id,
        sortOrder: f.sortOrder ?? i,
      })),
    );
  }

  return template;
}

export async function deleteTemplate(id: number): Promise<{ error?: string }> {
  const [tmpl] = await db
    .select()
    .from(pageTemplates)
    .where(eq(pageTemplates.id, id))
    .limit(1);

  if (!tmpl) return { error: "Template non trovato" };
  if (tmpl.isSystem) return { error: "I template di sistema non possono essere eliminati" };

  await db.delete(pageTemplates).where(eq(pageTemplates.id, id));
  return {};
}

export async function duplicateTemplate(id: number): Promise<PageTemplate | undefined> {
  const source = await getTemplateById(id);
  if (!source) return undefined;

  const newSlug = `${source.slug}-copia-${Date.now()}`;

  const [inserted] = await db
    .insert(pageTemplates)
    .values({
      name: `${source.name} (copia)`,
      slug: newSlug,
      description: source.description,
      styleConfig: source.styleConfig,
      thumbnail: source.thumbnail,
      isSystem: false,
    })
    .returning();

  if (source.fields.length > 0) {
    await db.insert(templateFields).values(
      source.fields.map((f) => ({
        templateId: inserted.id,
        fieldKey: f.fieldKey,
        fieldType: f.fieldType,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        defaultValue: f.defaultValue,
        options: f.options,
        sortOrder: f.sortOrder,
      })),
    );
  }

  return inserted;
}
