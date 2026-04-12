// app/(preview)/admin/preview/[id]/page.tsx
// Anteprima pagina CMS — accessibile solo agli admin.
// Vive nel route group (preview) isolato: niente sidebar/topbar admin.
// Mostra la pagina con isPreview=true indipendentemente dallo status (draft/published).
import { notFound, redirect } from "next/navigation";
import { getPageById } from "@/lib/db/pages-queries";
import { db } from "@/lib/db/drizzle";
import { pageTemplates, templateFields } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getLayoutComponent } from "@/app/(frontend)/_templates/registry";
import { parseStyleConfig, parseCustomFields } from "@/app/(frontend)/_templates/types";
import { requireAdminPage } from "@/lib/rbac/guards";
import PreviewBar from "./_preview-bar";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: Props) {
  // Auth guard: solo admin possono vedere l'anteprima
  await requireAdminPage();

  const { id } = await params;
  const pageId = parseInt(id, 10);
  if (isNaN(pageId)) return notFound();

  // Carica la pagina senza filtro di status (draft o published)
  const page = await getPageById(pageId);
  if (!page) return notFound();

  // Carica template + campi se presente
  let template = null;
  if (page.templateId) {
    const [tpl] = await db
      .select()
      .from(pageTemplates)
      .where(eq(pageTemplates.id, page.templateId))
      .limit(1);
    if (tpl) {
      const fields = await db
        .select()
        .from(templateFields)
        .where(eq(templateFields.templateId, tpl.id))
        .orderBy(asc(templateFields.sortOrder));
      template = { ...tpl, fields };
    }
  }

  const templateSlug = template?.slug ?? "default";
  const TemplateComponent = getLayoutComponent(templateSlug);
  const fields = parseCustomFields(page.customFields);
  const styleConfig = parseStyleConfig(template?.styleConfig);

  return (
    <>
      {/* Barra anteprima fissa in cima — fuori dal template */}
      <PreviewBar
        pageId={pageId}
        pageTitle={page.title}
        pageStatus={page.status}
        pageSlug={page.slug}
      />

      {/* Il template occupa tutto lo schermo sotto la barra */}
      <div style={{ paddingTop: "48px" }}>
        <TemplateComponent
          page={page}
          template={template}
          fields={fields}
          styleConfig={styleConfig}
          isPreview={true}
        />
      </div>
    </>
  );
}
