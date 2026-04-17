// app/(admin)/admin/security/ip-rules/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function IpRulesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:security");
  return <>{children}</>;
}
