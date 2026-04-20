// app/(admin)/admin/logs/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import { AdminPageHeader } from "../_components/admin-page-header";
import { ClipboardList } from "lucide-react";

export default async function LogsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:logs");
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={ClipboardList}
        section="Log attività"
        description="Traccia delle operazioni eseguite in app e in amministrazione."
      />
      {children}
    </div>
  );
}
