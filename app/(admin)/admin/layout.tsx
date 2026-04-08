// app/(admin)/admin/layout.tsx
import { requireAdminPage } from "@/lib/rbac/guards";
import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import AdminShellClient from "./_components/admin-shell-client";
import AdminHeaderRight from "./_components/header";

async function AdminShell({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([
    getAppSettings(),
    requireAdminPage(), // verifica isAdmin flag OR permesso admin:access via RBAC
  ]);

  const appName = settings.app_name?.trim() || "App";

  return (
    <AdminShellClient
      appName={appName}
      header={<AdminHeaderRight user={user} />}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
            />
          </div>
        }>
        {children}
      </Suspense>
    </AdminShellClient>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-screen items-center justify-center"
          style={{ background: "var(--admin-page-bg)" }}>
          <div
            className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
          />
        </div>
      }>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
