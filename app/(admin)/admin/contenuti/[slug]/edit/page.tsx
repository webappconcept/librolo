import { getPageBySlug, getAllPages } from "@/lib/db/pages-queries";
import { getAllTemplates } from "@/lib/db/template-queries";
import { getSeoPageByPathname } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { notFound } from "next/navigation";
import PageEditor from "../../_components/page-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifica pagina" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, pages, templates, settings] = await Promise.all([
    getPageBySlug(slug),
    getAllPages(),
    getAllTemplates(),
    getAppSettings(),
  ]);

  if (!page) notFound();

  const seo = await getSeoPageByPathname(`/${slug}`);

  return (
    <div className="p-6 max-w-4xl">
      <PageEditor
        page={page}
        seo={seo}
        pages={pages.filter((p) => p.id !== page.id)}
        templates={templates}
        domain={settings?.domain ?? ""}
        appName={settings?.appName ?? ""}
      />
    </div>
  );
}
