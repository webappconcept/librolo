"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface GrowthChartProps {
  data: { month: string; utenti: number }[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <div
      className="rounded-xl p-5 shadow-sm"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
      }}>
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--admin-text)" }}>
        Crescita utenti
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradUtenti" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--admin-accent)"
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor="var(--admin-accent)"
                stopOpacity={0}
              />
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
  );
}

interface DonutChartProps {
  free: number;
  premium: number;
}

export function PlanDonutChart({ free, premium }: DonutChartProps) {
  const data = [
    { name: "Free", value: free },
    { name: "Premium", value: premium },
  ];
  const total = free + premium;
  const premiumPct = total > 0 ? Math.round((premium / total) * 100) : 0;

  return (
    <div
      className="rounded-xl p-5 shadow-sm"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
      }}>
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--admin-text)" }}>
        Free vs Premium
      </h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                dataKey="value"
                strokeWidth={0}>
                <Cell fill="var(--admin-divider)" />
                <Cell fill="var(--admin-accent)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-xl font-bold"
              style={{ color: "var(--admin-text)" }}>
              {premiumPct}%
            </span>
            <span
              className="text-[10px]"
              style={{ color: "var(--admin-text-faint)" }}>
              premium
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--admin-accent)" }}
            />
            <span
              className="text-xs"
              style={{ color: "var(--admin-text-muted)" }}>
              Premium —{" "}
              <strong style={{ color: "var(--admin-text)" }}>{premium}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--admin-divider)" }}
            />
            <span
              className="text-xs"
              style={{ color: "var(--admin-text-muted)" }}>
              Free —{" "}
              <strong style={{ color: "var(--admin-text)" }}>{free}</strong>
            </span>
          </div>
          <div
            className="pt-1"
            style={{ borderTop: "1px solid var(--admin-divider)" }}>
            <span
              className="text-xs"
              style={{ color: "var(--admin-text-faint)" }}>
              Totale:{" "}
              <strong style={{ color: "var(--admin-text-muted)" }}>
                {total}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
