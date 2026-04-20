// app/(admin)/admin/pages/[id]/edit/page.tsx
import { getPageById, getAllPages } from "@/lib/db/pages-queries";
import { getAllTemplates, getTemplateById } from "@/lib/db/template-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { notFound } from "next/navigation";
import PageEditor from "../../_components/page-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Page" };

function getAllowedChildTemplateIds(styleConfig: string | null | undefined): number[] {
  try {
    const parsed = JSON.parse(styleConfig ?? "{}");
    const raw = parsed?.allowedChildTemplateIds;
    if (!Array.isArray(raw)) return [];
    return raw.map(Number).filter((n) => !isNaN(n));
  } catch {
    return [];
  }
}

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageId = Number(id);
  if (isNaN(pageId)) notFound();

  const [page, pages, templates, settings] = await Promise.all([
    getPageById(pageId),
    getAllPages(),
    getAllTemplates(),
    getAppSettings(),
  ]);

  if (!page) notFound();

  const seo = await getSeoPage(`/${page.slug}`);

  let templateLocked = false;
  if (page.parentId) {
    const parentPage = pages.find((p) => p.id === page.parentId);
    if (parentPage?.templateId) {
      const parentTemplate = await getTemplateById(parentPage.templateId);
      if (parentTemplate) {
        const allowed = getAllowedChildTemplateIds(parentTemplate.styleConfig);
        if (allowed.length === 1) {
          templateLocked = true;
        }
      }
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageEditor
        page={page}
        seo={seo}
        pages={pages.filter((p) => p.id !== page.id)}
        templates={templates}
        domain={settings?.app_domain ?? ""}
        appName={settings?.app_name ?? ""}
        templateLocked={templateLocked}
      />
    </div>
  );
}
