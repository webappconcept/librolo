import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function SeoLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:seo");
  return <>{children}</>;
}
