// app/(admin)/admin/security/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function SecurityLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:security");
  return <>{children}</>;
}
