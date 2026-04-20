"use client";

import {
  GitMerge,
  Globe,
  Map,
  SearchCheck,
  Search,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type SectionMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
};

const SECTIONS: Record<string, SectionMeta> = {
  "meta-tags": {
    label: "Meta Tags",
    description: "Gestisci i meta tag delle pagine predefinite e dei contenuti dell'app.",
    icon: SearchCheck,
  },
  robots: {
    label: "Robots",
    description: "Gestisci i file robots.txt e humans.txt serviti dall'app.",
    icon: Globe,
  },
  sitemap: {
    label: "Sitemap",
    description: "Generazione automatica del file sitemap.xml.",
    icon: Map,
  },
  redirect: {
    label: "Redirect",
    description: "Configura i redirect HTTP per le pagine spostate o rinominate.",
    icon: GitMerge,
  },
  "route-registry": {
    label: "Route Registry",
    description: "Registra e gestisci le route dell'app con visibilità e metadata.",
    icon: Map,
  },
};

const DEFAULT: SectionMeta = {
  label: "",
  description: "Ottimizza la visibilità dell'applicazione sui motori di ricerca.",
  icon: Search,
};

export function SeoHeader() {
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
              <span style={{ color: "var(--admin-text-muted)" }}>SEO</span>
              <span style={{ color: "var(--admin-text-faint)" }}> / </span>
              <span>{section.label}</span>
            </>
          ) : (
            "SEO"
          )}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
          {section.description}
        </p>
      </div>
    </div>
  );
}
