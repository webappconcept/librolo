"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DashboardChartsProps {
  growthData: { month: string; utenti: number }[];
  freeUsers: number;
  premiumUsers: number;
  pagesPublished: number;
  pagesDraft: number;
  templatesCount: number;
}

export function DashboardCharts({
  growthData,
  freeUsers,
  premiumUsers,
  pagesPublished,
  pagesDraft,
  templatesCount,
}: DashboardChartsProps) {
  const total = freeUsers + premiumUsers;
  const premiumPct = total > 0 ? Math.round((premiumUsers / total) * 100) : 0;

  const planData = [
    { name: "Free", value: freeUsers },
    { name: "Premium", value: premiumUsers },
  ];

  const cmsData = [
    { label: "Pubbl.", value: pagesPublished, fill: "#38bdf8" },
    { label: "Bozze", value: pagesDraft, fill: "#fb923c" },
    { label: "Template", value: templatesCount, fill: "#f472b6" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Area chart crescita utenti */}
      <div
        className="xl:col-span-2 rounded-xl p-5 shadow-sm"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            Crescita utenti
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: "color-mix(in oklch, var(--admin-accent) 12%, transparent)",
              color: "var(--admin-accent)",
            }}
          >
            Ultimi 7 mesi
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradUtenti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--admin-accent)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--admin-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-divider)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--admin-text-faint)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--admin-text-faint)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--admin-sidebar-bg)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 12,
              }}
              cursor={{
                stroke: "var(--admin-accent)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="utenti"
              stroke="var(--admin-accent)"
              strokeWidth={2}
              fill="url(#gradUtenti)"
              dot={{ fill: "var(--admin-accent)", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "var(--admin-accent)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Colonna destra: donut + bar CMS */}
      <div className="flex flex-col gap-4">
        {/* Donut piano utenti */}
        <div
          className="rounded-xl p-5 shadow-sm flex-1"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--admin-text)" }}>
            Free vs Premium
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill="var(--admin-divider)" />
                    <Cell fill="var(--admin-accent)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold" style={{ color: "var(--admin-text)" }}>
                  {premiumPct}%
                </span>
                <span className="text-[9px]" style={{ color: "var(--admin-text-faint)" }}>
                  premium
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: "var(--admin-accent)" }}
                />
                <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  Premium{" "}
                  <strong style={{ color: "var(--admin-text)" }}>{premiumUsers}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: "var(--admin-divider)" }}
                />
                <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  Free{" "}
                  <strong style={{ color: "var(--admin-text)" }}>{freeUsers}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar chart CMS */}
        <div
          className="rounded-xl p-5 shadow-sm flex-1"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--admin-text)" }}>
            Stato contenuti
          </h3>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={cmsData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--admin-text-faint)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--admin-text-faint)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--admin-sidebar-bg)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 11,
                }}
                cursor={{ fill: "transparent" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {cmsData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
