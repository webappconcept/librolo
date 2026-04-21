import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSectionPage("admin:users");
  return <>{children}</>;
}
