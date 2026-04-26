// app/(admin)/admin/tests/page.tsx
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/rbac/guards";
import { TestsDashboard } from "./_components/tests-dashboard";
import { getHealthChecks } from "./actions";

export const metadata: Metadata = { title: "Test & Stato sistema" };

export default async function AdminTestsPage() {
  await requireAdminPage();
  const health = await getHealthChecks();

  return <TestsDashboard health={health} />;
}
