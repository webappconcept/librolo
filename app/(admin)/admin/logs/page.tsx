// app/(admin)/admin/logs/page.tsx
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/rbac/guards";
import { getActivityLogs } from "@/lib/db/admin-queries";
import { LogsClient } from "./_components/logs-client";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Log attività" };

async function LogsContent({
  page,
  tab,
}: {
  page: number;
  tab: string;
}) {
  const data = await getActivityLogs({ page, perPage: 20, tab });
  return <LogsClient data={data} />;
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  await requireAdminPage();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const tab = params.tab ?? "rbac";

  return (
    <Suspense
      key={`${tab}-${page}`}
      fallback={
        <div className="flex items-center justify-center h-40">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
          />
        </div>
      }>
      <LogsContent page={page} tab={tab} />
    </Suspense>
  );
}
