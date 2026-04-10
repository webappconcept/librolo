import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:settings");
  return <>{children}</>;
}
