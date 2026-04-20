// app/(admin)/admin/settings/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:settings");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--admin-text)" }}>
          Impostazioni
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--admin-text-muted)" }}>
          Configura il comportamento dell&apos;applicazione.
        </p>
      </div>
      {children}
    </div>
  );
}
