// app/(admin)/admin/pages/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import { AdminPageHeader } from "../_components/admin-page-header";
import { FileText } from "lucide-react";

export default async function PagesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:content");
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={FileText}
        section="Pages"
        description="Manage the static pages of the site."
      />
      {children}
    </div>
  );
}
