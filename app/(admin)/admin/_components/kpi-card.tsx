// app/(admin)/admin/_components/kpi-card.tsx
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  trend?: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export default function KpiCard({
  title,
  value,
  sub,
  trend,
  icon: Icon,
  iconColor,
  iconBg,
}: KpiCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}>
          <Icon size={20} style={{ color: iconColor }} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
          <span
            className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}
            {trend}%
          </span>
          <span className="text-xs text-gray-400">rispetto al mese scorso</span>
        </div>
      )}
    </div>
  );
}
