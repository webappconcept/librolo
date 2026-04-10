import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function ContenutoLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:content");
  return <>{children}</>;
}
