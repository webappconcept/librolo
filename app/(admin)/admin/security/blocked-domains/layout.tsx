// app/(admin)/admin/security/blocked-domains/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function BlockedDomainsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:security");
  return <>{children}</>;
}
