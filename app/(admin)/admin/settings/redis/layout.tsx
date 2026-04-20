// app/(admin)/admin/settings/redis/layout.tsx
import { AdminPageHeader } from "../../_components/admin-page-header";
import { Database } from "lucide-react";

export default function SettingsRedisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Database}
        section="Impostazioni"
        subsection="Redis"
        description="Configura la connessione e le opzioni della cache Redis."
      />
      {children}
    </div>
  );
}
