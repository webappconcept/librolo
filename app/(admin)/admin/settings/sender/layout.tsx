// app/(admin)/admin/settings/sender/layout.tsx
import { AdminPageHeader } from "../../_components/admin-page-header";
import { Send } from "lucide-react";

export default function SettingsSenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Send}
        section="Impostazioni"
        subsection="Resend"
        description="Configura le credenziali e il mittente per l'invio delle email."
      />
      {children}
    </div>
  );
}
