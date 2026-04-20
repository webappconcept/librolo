// app/(admin)/admin/settings/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:settings");
  return <>{children}</>;
}
