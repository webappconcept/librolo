// app/(admin)/admin/[...not-found]/page.tsx
// Catch-all: cattura qualsiasi URL /admin/* non matchato da altre route.
// Mostra un 404 con il layout admin (sidebar + header) invece del 404 del front.
import { LayoutDashboard, SearchX } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pagina non trovata",
  robots: "noindex",
};

export default function AdminCatchAll() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-6">
      {/* Icona */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "color-mix(in srgb, var(--admin-accent) 10%, var(--admin-card-bg))",
          border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
        }}
      >
        <SearchX size={28} style={{ color: "var(--admin-accent)" }} />
      </div>

      {/* Testo */}
      <div className="space-y-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--admin-accent)" }}
        >
          Errore 404
        </p>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--admin-text)" }}
        >
          Pagina non trovata
        </h1>
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: "var(--admin-text-muted)" }}
        >
          La sezione che stai cercando non esiste o è stata rimossa dall&apos;area admin.
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
        style={{
          background: "var(--admin-accent)",
          color: "#fff",
        }}
      >
        <LayoutDashboard size={15} />
        Torna alla Dashboard
      </Link>
    </div>
  );
}
