import { notFound } from "next/navigation";
import { getTemplateById } from "@/lib/db/template-queries";
import { LAYOUT_BASES } from "@/app/(frontend)/_templates/registry";
import { saveTemplateAction } from "../actions";
import TemplateFormClient from "../_components/template-form-client";

export const metadata = { title: "Modifica template" };

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplateById(Number(id));
  if (!template) notFound();

  let styleConfig: Record<string, string> = {};
  try {
    styleConfig = JSON.parse(template.styleConfig ?? "{}");
  } catch {
    // noop
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--admin-text)" }}>
        Modifica template: {template.name}
      </h1>
      <TemplateFormClient
        template={{
          id: template.id,
          name: template.name,
          slug: template.slug,
          description: template.description ?? "",
          layoutBase: template.layoutBase,
          styleConfig,
          fields: template.fields,
          isSystem: template.isSystem,
        }}
        layoutBases={Object.entries(LAYOUT_BASES).map(([key, v]) => ({
          key,
          label: v.label,
          description: v.description,
        }))}
        saveAction={saveTemplateAction}
      />
    </div>
  );
}
