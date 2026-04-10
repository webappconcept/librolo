import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:staff");
  return <>{children}</>;
}
