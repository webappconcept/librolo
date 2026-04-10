import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function LogsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:logs");
  return <>{children}</>;
}
