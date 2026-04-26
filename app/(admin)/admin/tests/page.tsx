// app/(admin)/admin/tests/page.tsx
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/rbac/guards";
import { TestsDashboard } from "./_components/tests-dashboard";
import { getHealthChecks, getVitestReport } from "./actions";

export const metadata: Metadata = { title: "Tests & System Status" };

export default async function AdminTestsPage() {
  await requireAdminPage();
  const [health, vitestReport] = await Promise.all([
    getHealthChecks(),
    getVitestReport(),
  ]);
  return <TestsDashboard health={health} vitestReport={vitestReport} />;
}
