import { requireAdminSectionPage } from "@/lib/rbac/guards";

export default async function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSectionPage("admin:content");
  return <>{children}</>;
}
