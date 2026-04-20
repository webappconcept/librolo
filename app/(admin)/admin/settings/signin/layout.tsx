// app/(admin)/admin/settings/signin/layout.tsx
import { AdminPageHeader } from "../../_components/admin-page-header";
import { LogIn } from "lucide-react";

export default function SettingsSignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={LogIn}
        section="Impostazioni"
        subsection="SignIn"
        description="Configura le opzioni di accesso e registrazione degli utenti."
      />
      {children}
    </div>
  );
}
