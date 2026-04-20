"use client";

import { Settings } from "lucide-react";
import { usePathname } from "next/navigation";

const SECTION_LABELS: Record<string, string> = {
  generale: "Generale",
  comportamento: "Comportamento",
  signin: "SignIn",
  sender: "Resend",
  email: "Email",
  contenuti: "Contenuti",
  redis: "Redis",
};

export function SettingsHeader() {
  const pathname = usePathname();
  const segment = pathname.split("/").pop() ?? "";
  const sub = SECTION_LABELS[segment];

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{
          background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
          border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
        }}
      >
        <Settings size={18} style={{ color: "var(--admin-accent)" }} />
      </div>
      <div>
        <h2 className="text-xl font-bold flex items-center gap-1.5" style={{ color: "var(--admin-text)" }}>
          Impostazioni
          {sub && (
            <>
              <span style={{ color: "var(--admin-text-faint)" }}>/</span>
              <span>{sub}</span>
            </>
          )}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
          Configura il comportamento dell&apos;applicazione.
        </p>
      </div>
    </div>
  );
}
