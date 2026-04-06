// app/(admin)/admin/layout.tsx
import { getUser } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AdminShellClient from "./_components/admin-shell-client";
import AdminHeaderRight from "./_components/header";

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user || user.role !== "admin") redirect("/");

  return (
    <AdminShellClient header={<AdminHeaderRight user={user} />}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-[#e07a3a] border-t-transparent rounded-full animate-spin" />
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
        <div className="flex h-screen items-center justify-center bg-[#f1f5f9]">
          <div className="w-6 h-6 border-2 border-[#e07a3a] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
