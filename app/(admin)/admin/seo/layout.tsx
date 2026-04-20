// app/(admin)/admin/seo/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import { SeoHeader } from "./_components/seo-header";

export default async function SeoLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:seo");
  return (
    <div className="space-y-5">
      <SeoHeader />
      {children}
    </div>
  );
}
