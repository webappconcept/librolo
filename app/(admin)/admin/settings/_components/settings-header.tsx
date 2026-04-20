"use client";

import {
  Code2,
  Database,
  Globe,
  LogIn,
  Mail,
  Send,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type SectionMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
};

const SECTIONS: Record<string, SectionMeta> = {
  generale: {
    label: "Generale",
    description: "Nome, logo e informazioni principali dell'applicazione.",
    icon: Globe,
  },
  comportamento: {
    label: "Comportamento",
    description: "Gestisci le impostazioni di comportamento della piattaforma.",
    icon: SlidersHorizontal,
  },
  signin: {
    label: "SignIn",
    description: "Configura le opzioni di accesso e registrazione degli utenti.",
    icon: LogIn,
  },
  sender: {
    label: "Resend",
    description: "Configura le credenziali e il mittente per l'invio delle email.",
    icon: Send,
  },
  email: {
    label: "Email",
    description: "Personalizza i template delle email inviate dal sistema.",
    icon: Mail,
  },
  contenuti: {
    label: "Contenuti",
    description: "Gestisci gli snippet e i contenuti testuali dell'applicazione.",
    icon: Code2,
  },
  redis: {
    label: "Redis",
    description: "Configura la connessione e le opzioni della cache Redis.",
    icon: Database,
  },
};

const DEFAULT: SectionMeta = {
  label: "",
  description: "Configura il comportamento dell'applicazione.",
  icon: Settings,
};

export function SettingsHeader() {
  const pathname = usePathname();
  const segment = pathname.split("/").pop() ?? "";
  const section = SECTIONS[segment] ?? DEFAULT;
  const Icon = section.icon;

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
          border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
        }}
      >
        <Icon size={18} style={{ color: "var(--admin-accent)" }} />
      </div>
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
          {section.label ? (
            <>
              <span style={{ color: "var(--admin-text-muted)" }}>Impostazioni</span>
              <span style={{ color: "var(--admin-text-faint)" }}> / </span>
              <span>{section.label}</span>
            </>
          ) : (
            "Impostazioni"
          )}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
          {section.description}
        </p>
      </div>
    </div>
  );
}
