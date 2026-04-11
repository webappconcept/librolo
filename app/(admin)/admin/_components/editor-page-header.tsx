// app/(admin)/admin/_components/editor-page-header.tsx
// Header unificato per tutte le pagine di modifica/creazione contenuti.
// Usato sia da PageEditor (pagine) che da TemplateFormClient (template).
"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export interface BreadcrumbSegment {
  label: string;
  /** Se fornito, il segmento è cliccabile */
  href?: string;
}

interface EditorPageHeaderProps {
  /** Segmenti del breadcrumb, escluso l'ultimo (nome corrente) */
  breadcrumbs: BreadcrumbSegment[];
  /** Ultimo segmento – nome della pagina/template corrente */
  currentLabel: string;
  /** Destinazione del tasto "← Torna indietro" */
  backHref: string;
  /** Testo del pulsante di salvataggio */
  saveLabel?: string;
  /** ID del <form> a cui il bottone Salva è collegato */
  formId: string;
  /** Spinner + disable durante il salvataggio */
  isPending?: boolean;
  /** Feedback "Salvato alle HH:MM" */
  savedAt?: string | null;
  /** Messaggio di errore inline */
  error?: string | null;
}

export function EditorPageHeader({
  breadcrumbs,
  currentLabel,
  backHref,
  saveLabel = "Salva modifiche",
  formId,
  isPending = false,
  savedAt,
  error,
}: EditorPageHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-5 space-y-2">
      {/* Riga principale: ← | breadcrumb | [Salva] */}
      <div className="flex items-center gap-3">
        {/* Tasto indietro */}
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1.5 text-sm shrink-0 transition-colors"
          style={{ color: "var(--admin-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted)")}>
          <ArrowLeft size={15} />
          {/* Su mobile mostra solo la freccia, su desktop il testo */}
          <span className="hidden sm:inline">Torna indietro</span>
        </button>

        {/* Separatore verticale */}
        <div className="w-px h-4 shrink-0" style={{ background: "var(--admin-divider)" }} />

        {/* Breadcrumb — troncato su mobile */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden"
        >
          {breadcrumbs.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5 shrink-0">
              {seg.href ? (
                <a
                  href={seg.href}
                  className="text-xs transition-colors hover:underline"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {/* Nascondi i segmenti intermedi su schermi piccoli */}
                  <span className={i < breadcrumbs.length - 1 ? "hidden sm:inline" : ""}>
                    {seg.label}
                  </span>
                  {/* Su mobile mostra solo l'ultimo breadcrumb genitore */}
                  {i === breadcrumbs.length - 1 && (
                    <span className="sm:hidden">{seg.label}</span>
                  )}
                </a>
              ) : (
                <span
                  className="text-xs"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  <span className={i < breadcrumbs.length - 1 ? "hidden sm:inline" : ""}>
                    {seg.label}
                  </span>
                  {i === breadcrumbs.length - 1 && (
                    <span className="sm:hidden">{seg.label}</span>
                  )}
                </span>
              )}
              <span
                className="text-xs select-none"
                style={{ color: "var(--admin-text-faint)" }}
                aria-hidden
              >
                /
              </span>
            </span>
          ))}
          {/* Segmento corrente (non cliccabile) — troncato se lungo */}
          <span
            className="text-xs font-medium truncate"
            style={{ color: "var(--admin-text)" }}
            title={currentLabel}
          >
            {currentLabel}
          </span>
        </nav>

        {/* Destra: feedback + bottone Salva */}
        <div className="flex items-center gap-2 shrink-0">
          {savedAt && (
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
              style={{
                color: "#22c55e",
                background: "color-mix(in srgb, #22c55e 12%, var(--admin-card-bg))",
                border: "1px solid color-mix(in srgb, #22c55e 25%, transparent)",
              }}
            >
              <Check size={12} />
              <span>Salvato alle {savedAt}</span>
            </span>
          )}
          {/* Su mobile: solo icona check verde */}
          {savedAt && (
            <span
              className="sm:hidden flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                color: "#22c55e",
                background: "color-mix(in srgb, #22c55e 12%, var(--admin-card-bg))",
              }}
            >
              <Check size={13} />
            </span>
          )}

          <button
            type="submit"
            form={formId}
            disabled={isPending}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-60"
            style={{ background: "var(--admin-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            {isPending && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {/* Su mobile testo corto */}
            <span className="sm:hidden">{isPending ? "…" : "Salva"}</span>
            <span className="hidden sm:inline">
              {isPending ? "Salvataggio…" : saveLabel}
            </span>
          </button>
        </div>
      </div>

      {/* Errore inline sotto l'header */}
      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{
            color: "#ef4444",
            background: "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
