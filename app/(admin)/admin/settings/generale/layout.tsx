// app/(admin)/admin/settings/generale/layout.tsx
import { AdminPageHeader } from "../../_components/admin-page-header";
import { Globe } from "lucide-react";

export default function SettingsGeneraleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Globe}
        section="Impostazioni"
        subsection="Generale"
        description="Nome, logo e informazioni principali dell'applicazione."
      />
      {children}
    </div>
  );
}
