import { getAllTemplates } from "@/lib/db/template-queries";
import { saveTemplateAction } from "../actions";
import TemplateFormClient from "../_components/template-form-client";

export const metadata = { title: "Nuovo template" };
export const dynamic = "force-dynamic";

export default async function NuovoTemplatePage() {
  const allTemplates = await getAllTemplates();
  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <TemplateFormClient
        allTemplates={allTemplates.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
        saveAction={saveTemplateAction}
      />
    </div>
  );
}
