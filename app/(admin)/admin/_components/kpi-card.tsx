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
    <div
      className="rounded-xl p-5 shadow-sm"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
      }}>
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--admin-text-muted)" }}>
            {title}
          </p>
          <p
            className="text-2xl font-bold mt-1"
            style={{ color: "var(--admin-text)" }}>
            {value}
          </p>
          {sub && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--admin-text-faint)" }}>
              {sub}
            </p>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}>
          <Icon size={20} style={{ color: iconColor }} />
        </div>
      </div>

      {trend !== undefined && (
        <div
          className="mt-3 pt-3 flex items-center gap-1.5"
          style={{ borderTop: "1px solid var(--admin-divider)" }}>
          <span
            className={`text-xs font-semibold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
            {isPositive ? "+" : ""}
            {trend}%
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-faint)" }}>
            rispetto al mese scorso
          </span>
        </div>
      )}
    </div>
  );
}
