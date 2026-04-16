// app/(admin)/admin/settings/settings-tabs.tsx
"use client";

import type { AppSettings } from "@/lib/db/settings-queries";
import type { Role, SiteSnippet } from "@/lib/db/schema";
import { Code2, LogIn, Mail, MailOpen, Map, Send, Settings, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { BehaviourTab } from "./tabs/behaviour-tab";
import { EmailTemplatesTab } from "./tabs/email-templates-tab";
import { GeneralTab } from "./tabs/general-tab";
import { RoutesTab } from "./tabs/routes-tab";
import { SenderTab } from "./tabs/sender-tab";
import { SignInTab } from "./tabs/signin-tab";
import { SnippetsTab } from "./tabs/snippets-tab";

const TABS = [
  { id: "general",         label: "Generale",      icon: Settings },
  { id: "behaviour",       label: "Comportamento", icon: SlidersHorizontal },
  { id: "signin",          label: "SignIn",         icon: LogIn },
  { id: "sender",          label: "Sender",         icon: Send },
  { id: "email-templates", label: "Email",          icon: MailOpen },
  { id: "routes",          label: "Route",          icon: Map },
  { id: "snippets",        label: "Contenuti",      icon: Code2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsTabs({
  settings,
  snippets,
  roles,
  disposableDomains,
}: {
  settings: AppSettings;
  snippets: SiteSnippet[];
  roles: Role[];
  disposableDomains: string[];
}) {
  const [active, setActive] = useState<TabId>("general");

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div
        className="flex flex-wrap gap-1 p-1 rounded-xl w-fit"
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
      {active === "general"         && <GeneralTab settings={settings} />}
      {active === "behaviour"       && <BehaviourTab settings={settings} />}
      {active === "signin"          && (
        <SignInTab
          settings={settings}
          roles={roles}
          initialDomains={disposableDomains}
        />
      )}
      {active === "sender"          && <SenderTab settings={settings} />}
      {active === "email-templates" && <EmailTemplatesTab settings={settings} />}
      {active === "routes"          && <RoutesTab />}
      {active === "snippets"        && <SnippetsTab initialSnippets={snippets} />}
    </div>
  );
}
