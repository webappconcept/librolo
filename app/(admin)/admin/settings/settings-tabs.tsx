// app/(admin)/admin/settings/settings-tabs.tsx
"use client";

import type { AppSettings } from "@/lib/db/settings-queries";
import { Mail, Map, Settings, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { BehaviourTab } from "./tabs/behaviour-tab";
import { EmailTab } from "./tabs/email-tab";
import { GeneralTab } from "./tabs/general-tab";
import { RoutesTab } from "./tabs/routes-tab";

const TABS = [
  { id: "general", label: "Generale", icon: Settings },
  { id: "behaviour", label: "Comportamento", icon: SlidersHorizontal },
  { id: "email", label: "Email", icon: Mail },
  { id: "routes", label: "Route", icon: Map },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsTabs({ settings }: { settings: AppSettings }) {
  const [active, setActive] = useState<TabId>("general");

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: isActive ? "var(--admin-accent)" : "transparent",
                color: isActive ? "#fff" : "var(--admin-text-muted)",
              }}>
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Pannelli */}
      {active === "general" && <GeneralTab settings={settings} />}
      {active === "behaviour" && <BehaviourTab settings={settings} />}
      {active === "email" && <EmailTab settings={settings} />}
      {active === "routes" && <RoutesTab />}
    </div>
  );
}
