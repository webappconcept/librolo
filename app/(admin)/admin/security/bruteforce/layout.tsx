// app/(admin)/admin/security/bruteforce/layout.tsx
import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function BruteforceLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:security");
  return <>{children}</>;
}
