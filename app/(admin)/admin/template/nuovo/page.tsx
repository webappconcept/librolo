import { saveTemplateAction } from "../actions";
import TemplateFormClient from "../_components/template-form-client";

export const metadata = { title: "Nuovo template" };
export const dynamic = "force-dynamic";

export default function NuovoTemplatePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <TemplateFormClient saveAction={saveTemplateAction} />
    </div>
  );
}
