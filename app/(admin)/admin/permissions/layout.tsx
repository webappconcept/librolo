import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function PermissionsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:roles");
  return <>{children}</>;
}
