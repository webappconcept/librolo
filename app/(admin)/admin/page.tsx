// app/(admin)/admin/page.tsx
import { getDashboardStats, getUserGrowthChart } from "@/lib/db/admin-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { CreditCard, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { GrowthChart, PlanDonutChart } from "./_components/charts";
import KpiCard from "./_components/kpi-card";

export default async function AdminDashboardPage() {
  const [stats, growthData, settings] = await Promise.all([
    getDashboardStats(),
    getUserGrowthChart(),
    getAppSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--admin-text)" }}>
          Dashboard
        </h2>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--admin-text-muted)" }}>
          Panoramica in tempo reale di {settings.app_name}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Utenti totali"
          value={stats.totalUsers}
          sub="utenti attivi"
          icon={Users}
          iconColor="#e07a3a"
          iconBg="#fdf0e7"
        />
        <KpiCard
          title="Nuovi questo mese"
          value={stats.newUsersThisMonth}
          trend={stats.trendPercent}
          icon={TrendingUp}
          iconColor="#7dbe9e"
          iconBg="#edf7f2"
        />
        <KpiCard
          title="Utenti premium"
          value={stats.premiumUsers}
          sub={`${stats.conversionRate}% conversione`}
          icon={CreditCard}
          iconColor="#6366f1"
          iconBg="#eef2ff"
        />
        <KpiCard
          title="Email verificate"
          value={stats.verifiedUsers}
          sub={`su ${stats.totalUsers} totali`}
          icon={ShieldCheck}
          iconColor="#f59e0b"
          iconBg="#fffbeb"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <GrowthChart data={growthData} />
        </div>
        <PlanDonutChart free={stats.freeUsers} premium={stats.premiumUsers} />
      </div>
    </div>
  );
}
