// app/(admin)/admin/settings/contenuti/layout.tsx
import { AdminPageHeader } from "../../_components/admin-page-header";
import { Code2 } from "lucide-react";

export default function SettingsContenutiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Code2}
        section="Impostazioni"
        subsection="Contenuti"
        description="Gestisci gli snippet e i contenuti testuali dell'applicazione."
      />
      {children}
    </div>
  );
}
