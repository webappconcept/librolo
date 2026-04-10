import { getAllPages } from "@/lib/db/pages-queries";
import { getAllTemplates } from "@/lib/db/template-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import PageEditor from "../_components/page-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuova pagina" };

export default async function NewPagePage() {
  const [pages, templates, settings] = await Promise.all([
    getAllPages(),
    getAllTemplates(),
    getAppSettings(),
  ]);

  return (
    <div className="p-6 max-w-4xl">
      <PageEditor
        pages={pages}
        templates={templates}
        domain={settings?.domain ?? ""}
        appName={settings?.appName ?? ""}
      />
    </div>
  );
}
