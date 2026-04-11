import { saveTemplateAction } from "../actions";
import TemplateFormClient from "../_components/template-form-client";

export const metadata = { title: "Nuovo template" };
export const dynamic = "force-dynamic";

export default function NuovoTemplatePage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--admin-text)" }}>
        Nuovo template
      </h1>
      <TemplateFormClient saveAction={saveTemplateAction} />
    </div>
  );
}
