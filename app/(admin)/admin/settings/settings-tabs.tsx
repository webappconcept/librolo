// app/(admin)/admin/settings/settings-tabs.tsx
"use client";

import type { AppSettings } from "@/lib/db/settings-queries";
import { useState } from "react";
import { BehaviourTab } from "./tabs/behaviour-tab";
import { EmailTab } from "./tabs/email-tab";
import { GeneralTab } from "./tabs/general-tab";

const TABS = [
  { id: "general", label: "Generale" },
  { id: "behaviour", label: "Comportamento" },
  { id: "email", label: "Email" },
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
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: isActive ? "var(--admin-accent)" : "transparent",
                color: isActive ? "#fff" : "var(--admin-text-muted)",
              }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Pannelli */}
      {active === "general" && <GeneralTab settings={settings} />}
      {active === "behaviour" && <BehaviourTab settings={settings} />}
      {active === "email" && <EmailTab settings={settings} />}
    </div>
  );
}
