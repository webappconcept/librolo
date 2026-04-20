// app/(admin)/admin/users/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import { AdminPageHeader } from "../_components/admin-page-header";
import { Users } from "lucide-react";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:users");
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Users}
        section="Utenti"
        description="Gestisci gli utenti registrati sulla piattaforma."
      />
      {children}
    </div>
  );
}
