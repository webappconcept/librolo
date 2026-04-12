// app/(admin)/admin/page.tsx
import { getDashboardStats, getUserGrowthChart } from "@/lib/db/admin-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import {
  BookOpen,
  FileText,
  GitMerge,
  PanelTop,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import { DashboardCharts } from "./_components/dashboard-charts";
import KpiCard from "./_components/kpi-card";
import { db } from "@/lib/db/drizzle";
import { pages, pageTemplates, redirects } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";

async function getCmsStats() {
  try {
    const [pub, draft, tpl, red] = await Promise.all([
      db.select({ count: count() }).from(pages).where(eq(pages.status, "published")),
      db.select({ count: count() }).from(pages).where(eq(pages.status, "draft")),
      db.select({ count: count() }).from(pageTemplates),
      db.select({ count: count() }).from(redirects).where(eq(redirects.isActive, true)),
    ]);
    return {
      pagesPublished: pub[0].count,
      pagesDraft: draft[0].count,
      templatesCount: tpl[0].count,
      redirectsCount: red[0].count,
    };
  } catch {
    return { pagesPublished: 0, pagesDraft: 0, templatesCount: 0, redirectsCount: 0 };
  }
}

async function getGrowthSafe() {
  try {
    return await getUserGrowthChart();
  } catch {
    return [];
  }
}

export default async function AdminDashboardPage() {
  const [userStats, cmsStats, growthData, settings] = await Promise.all([
    getDashboardStats(),
    getCmsStats(),
    getGrowthSafe(),
    getAppSettings(),
  ]);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Buongiorno"
      : now.getHours() < 18
        ? "Buon pomeriggio"
        : "Buonasera";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--admin-text)" }}>
            {greeting}
          </h2>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--admin-text-muted)" }}>
            Panoramica in tempo reale di{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--admin-accent)" }}>
              {settings.app_name}
            </span>
          </p>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
            color: "var(--admin-text-muted)",
          }}>
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#22c55e" }}
          />
          Live
        </div>
      </div>

      {/* Sezione Utenti */}
      <section>
        <h3
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--admin-text-faint)" }}>
          Utenti
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Utenti totali"
            value={userStats.totalUsers}
            sub="utenti registrati"
            icon={Users}
            iconColor="#e07a3a"
            iconBg="color-mix(in oklch, #e07a3a 12%, transparent)"
          />
          <KpiCard
            title="Nuovi questo mese"
            value={userStats.newUsersThisMonth}
            trend={userStats.trendPercent}
            icon={TrendingUp}
            iconColor="#22c55e"
            iconBg="color-mix(in oklch, #22c55e 12%, transparent)"
          />
          <KpiCard
            title="Utenti premium"
            value={userStats.premiumUsers}
            sub={`${userStats.conversionRate}% conversione`}
            icon={ShieldCheck}
            iconColor="var(--admin-accent)"
            iconBg="color-mix(in oklch, var(--admin-accent) 12%, transparent)"
          />
          <KpiCard
            title="Staff attivi"
            value={0}
            sub="con accesso admin"
            icon={UserCog}
            iconColor="#a78bfa"
            iconBg="color-mix(in oklch, #a78bfa 12%, transparent)"
          />
        </div>
      </section>

      {/* Sezione CMS */}
      <section>
        <h3
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--admin-text-faint)" }}>
          Contenuti & CMS
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Pagine pubblicate"
            value={cmsStats.pagesPublished}
            sub="visibili sul sito"
            icon={FileText}
            iconColor="#38bdf8"
            iconBg="color-mix(in oklch, #38bdf8 12%, transparent)"
          />
          <KpiCard
            title="Bozze"
            value={cmsStats.pagesDraft}
            sub="in attesa di pubblicazione"
            icon={BookOpen}
            iconColor="#fb923c"
            iconBg="color-mix(in oklch, #fb923c 12%, transparent)"
          />
          <KpiCard
            title="Template"
            value={cmsStats.templatesCount}
            sub="layout disponibili"
            icon={PanelTop}
            iconColor="#f472b6"
            iconBg="color-mix(in oklch, #f472b6 12%, transparent)"
          />
          <KpiCard
            title="Redirect attivi"
            value={cmsStats.redirectsCount}
            sub="reindirizzamenti"
            icon={GitMerge}
            iconColor="#fbbf24"
            iconBg="color-mix(in oklch, #fbbf24 12%, transparent)"
          />
        </div>
      </section>

      {/* Charts */}
      <DashboardCharts
        growthData={growthData}
        freeUsers={userStats.freeUsers}
        premiumUsers={userStats.premiumUsers}
        pagesPublished={cmsStats.pagesPublished}
        pagesDraft={cmsStats.pagesDraft}
        templatesCount={cmsStats.templatesCount}
      />
    </div>
  );
}
