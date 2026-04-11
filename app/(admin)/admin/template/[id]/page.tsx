import { notFound } from "next/navigation";
import { getTemplateById } from "@/lib/db/template-queries";
import { saveTemplateAction } from "../actions";
import TemplateFormClient from "../_components/template-form-client";

export const metadata = { title: "Modifica template" };
export const dynamic = "force-dynamic";

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
    <div className="p-4 sm:p-6 max-w-3xl">
      <TemplateFormClient
        template={{
          id: template.id,
          name: template.name,
          slug: template.slug,
          description: template.description ?? "",
          styleConfig,
          fields: template.fields,
          isSystem: template.isSystem,
        }}
        saveAction={saveTemplateAction}
      />
    </div>
  );
}
