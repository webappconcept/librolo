// app/(admin)/admin/seo/sitemap/page.tsx
import { Map } from "lucide-react";

export default function SitemapPage() {
  return (
    <div
      className="rounded-xl p-12 flex flex-col items-center justify-center text-center"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px dashed var(--admin-card-border)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--admin-hover-bg)" }}
      >
        <Map size={28} style={{ color: "var(--admin-text-faint)" }} />
      </div>
      <p className="font-semibold text-sm mb-1" style={{ color: "var(--admin-text)" }}>
        In arrivo
      </p>
      <p className="text-sm max-w-sm" style={{ color: "var(--admin-text-muted)" }}>
        La generazione automatica della sitemap XML verrà implementata in una prossima versione.
        Potrai configurare le priorità, le frequenze di aggiornamento e le pagine da escludere.
      </p>
    </div>
  );
}
