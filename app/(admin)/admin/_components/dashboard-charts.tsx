"use client";

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
  const freePct = 100 - premiumPct;

  const maxUtenti = Math.max(...growthData.map((d) => d.utenti), 1);

  const cmsData = [
    { label: "Pubblicate", value: pagesPublished, color: "#38bdf8" },
    { label: "Bozze", value: pagesDraft, color: "#fb923c" },
    { label: "Template", value: templatesCount, color: "#f472b6" },
  ];
  const maxCms = Math.max(...cmsData.map((d) => d.value), 1);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Bar chart crescita utenti — CSS puro */}
      <div
        className="xl:col-span-2 rounded-xl p-5 shadow-sm"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
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
        <div className="flex items-end gap-2 h-40">
          {growthData.map((d) => {
            const heightPct = (d.utenti / maxUtenti) * 100;
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "var(--admin-text-faint)" }}
                >
                  {d.utenti}
                </span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(heightPct, 4)}%`,
                    background: "var(--admin-accent)",
                    opacity: 0.8,
                    minHeight: 4,
                  }}
                />
                <span
                  className="text-[10px]"
                  style={{ color: "var(--admin-text-faint)" }}
                >
                  {d.month}
                </span>
              </div>
            );
          })}
          {growthData.length === 0 && (
            <p className="text-xs m-auto" style={{ color: "var(--admin-text-faint)" }}>
              Nessun dato disponibile
            </p>
          )}
        </div>
      </div>

      {/* Colonna destra */}
      <div className="flex flex-col gap-4">
        {/* Donut-like — anello CSS */}
        <div
          className="rounded-xl p-5 shadow-sm flex-1"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>
            Free vs Premium
          </h3>
          <div className="flex items-center gap-5">
            {/* Cerchio conic-gradient */}
            <div
              className="shrink-0 w-[90px] h-[90px] rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(var(--admin-accent) 0% ${premiumPct}%, var(--admin-divider) ${premiumPct}% 100%)`,
              }}
            >
              <div
                className="w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center"
                style={{ background: "var(--admin-card-bg)" }}
              >
                <span className="text-sm font-bold" style={{ color: "var(--admin-text)" }}>
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
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--admin-accent)" }}
                />
                <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  Premium <strong style={{ color: "var(--admin-text)" }}>{premiumUsers}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--admin-divider)" }}
                />
                <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  Free <strong style={{ color: "var(--admin-text)" }}>{freeUsers}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar chart CMS — CSS puro */}
        <div
          className="rounded-xl p-5 shadow-sm flex-1"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>
            Stato contenuti
          </h3>
          <div className="space-y-3">
            {cmsData.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--admin-text-muted)" }}>{item.label}</span>
                  <span style={{ color: "var(--admin-text)" }}>{item.value}</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--admin-divider)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(item.value / maxCms) * 100}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
