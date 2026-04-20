// app/(admin)/admin/settings/email/layout.tsx
import { AdminPageHeader } from "../../_components/admin-page-header";
import { Mail } from "lucide-react";

export default function SettingsEmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Mail}
        section="Impostazioni"
        subsection="Email"
        description="Personalizza i template delle email inviate dal sistema."
      />
      {children}
    </div>
  );
}
