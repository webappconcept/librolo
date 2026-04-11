import { getAllPages } from "@/lib/db/pages-queries";
import { getAllTemplates } from "@/lib/db/template-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import PageEditor from "../_components/page-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuova pagina" };

export default async function NewPagePage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string }>;
}) {
  const [pages, templates, settings, params] = await Promise.all([
    getAllPages(),
    getAllTemplates(),
    getAppSettings(),
    searchParams,
  ]);

  const initialParentId = params.parentId ? Number(params.parentId) : null;

  return (
    <div className="p-6 max-w-4xl">
      <PageEditor
        pages={pages}
        templates={templates}
        domain={settings?.app_domain ?? ""}
        appName={settings?.app_name ?? ""}
        initialParentId={initialParentId}
      />
    </div>
  );
}
