// app/(admin)/admin/_components/charts.tsx
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
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Crescita utenti
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradUtenti" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e07a3a" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#e07a3a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1c2434",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
            }}
            cursor={{
              stroke: "#e07a3a",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Area
            type="monotone"
            dataKey="utenti"
            stroke="#e07a3a"
            strokeWidth={2}
            fill="url(#gradUtenti)"
            dot={{ fill: "#e07a3a", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#e07a3a" }}
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

const COLORS = ["#e2e8f0", "#e07a3a"];

export function PlanDonutChart({ free, premium }: DonutChartProps) {
  const data = [
    { name: "Free", value: free },
    { name: "Premium", value: premium },
  ];
  const total = free + premium;
  const premiumPct = total > 0 ? Math.round((premium / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
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
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-gray-800">
              {premiumPct}%
            </span>
            <span className="text-[10px] text-gray-400">premium</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e07a3a]" />
            <span className="text-xs text-gray-600">
              Premium — <strong>{premium}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0]" />
            <span className="text-xs text-gray-600">
              Free — <strong>{free}</strong>
            </span>
          </div>
          <div className="pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Totale: <strong className="text-gray-600">{total}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
