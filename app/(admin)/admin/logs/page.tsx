// app/(admin)/admin/logs/page.tsx
import { requireAdminPage } from "@/lib/rbac/guards";
import { getActivityLogs } from "@/lib/db/admin-queries";
import { LogsClient } from "./_components/logs-client";
import { Suspense } from "react";

export const metadata = { title: "Log attività" };

async function LogsContent() {
  const logs = await getActivityLogs({ limit: 200 });
  return <LogsClient logs={logs} />;
}

export default async function AdminLogsPage() {
  await requireAdminPage();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
          Log attività
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
          Traccia delle operazioni eseguite dagli amministratori sul pannello.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-40">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
            />
          </div>
        }>
        <LogsContent />
      </Suspense>
    </div>
  );
}
