// app/(admin)/admin/settings/comportamento/layout.tsx
import { AdminPageHeader } from "../../_components/admin-page-header";
import { SlidersHorizontal } from "lucide-react";

export default function SettingsComportamentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={SlidersHorizontal}
        section="Impostazioni"
        subsection="Comportamento"
        description="Gestisci le impostazioni di comportamento della piattaforma."
      />
      {children}
    </div>
  );
}
