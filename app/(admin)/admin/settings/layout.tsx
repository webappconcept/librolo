// app/(admin)/admin/settings/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import { Settings } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:settings");
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
          }}
        >
          <Settings size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--admin-text)" }}>
            Impostazioni
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
            Configura il comportamento dell&apos;applicazione.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
