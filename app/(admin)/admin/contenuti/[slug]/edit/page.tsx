import { getPageBySlug } from "@/lib/db/pages-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { notFound } from "next/navigation";
import PageEditor from "../../_components/page-editor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditPagePage({ params }: Props) {
  const { slug } = await params;
  const [page, seo, settings] = await Promise.all([
    getPageBySlug(slug),
    getSeoPage(`/${slug}`),
    getAppSettings(),
  ]);
  if (!page) notFound();

  let domain = settings.app_domain?.trim() ?? "";
  if (domain && !/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  domain = domain.replace(/\/$/, "");

  const appName = settings.app_name?.trim() ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--admin-text)" }}>
          Modifica pagina
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
          Stai modificando:{" "}
          <strong style={{ color: "var(--admin-text)" }}>/{page.slug}</strong>
        </p>
      </div>
      <div
        className="rounded-xl shadow-sm p-5"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}
      >
        <PageEditor page={page} seo={seo} domain={domain} appName={appName} />
      </div>
    </div>
  );
}
