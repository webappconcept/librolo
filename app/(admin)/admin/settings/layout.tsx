// app/(admin)/admin/settings/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import type { Metadata } from "next";
import { SettingsHeader } from "./_components/settings-header";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSectionPage("admin:settings");
  return (
    <div className="space-y-5">
      <SettingsHeader />
      {children}
    </div>
  );
}
