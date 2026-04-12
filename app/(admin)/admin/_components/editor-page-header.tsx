// app/(admin)/admin/_components/editor-page-header.tsx
"use client";

import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface EditorPageHeaderProps {
  breadcrumbs: BreadcrumbSegment[];
  currentLabel: string;
  backHref: string;
  saveLabel?: string;
  formId: string;
  isPending?: boolean;
  savedAt?: string | null;
  error?: string | null;
  /** URL di anteprima front-end (es. https://miosito.it/blog/articolo).
   *  Se fornito, mostra il bottone anteprima accanto a Salva. */
  previewUrl?: string | null;
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
  previewUrl,
}: EditorPageHeaderProps) {
  const router = useRouter();
  const lastIdx = breadcrumbs.length - 1;

  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center gap-3">
        {/* ← Torna indietro */}
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1.5 text-sm shrink-0 transition-colors"
          style={{ color: "var(--admin-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted)")}
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Torna indietro</span>
        </button>

        <div className="w-px h-4 shrink-0" style={{ background: "var(--admin-divider)" }} />

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden"
        >
          {breadcrumbs.map((seg, i) => {
            const hiddenOnMobile = i < lastIdx;
            return (
              <span
                key={i}
                className={`flex items-center gap-1 shrink-0 ${hiddenOnMobile ? "hidden sm:flex" : "flex"}`}
              >
                {seg.href ? (
                  <a
                    href={seg.href}
                    className="text-xs transition-colors hover:underline"
                    style={{ color: "var(--admin-text-muted)" }}
                  >
                    {seg.label}
                  </a>
                ) : (
                  <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                    {seg.label}
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
            );
          })}

          {/* Segmento corrente */}
          <span
            className="text-xs font-medium truncate"
            style={{ color: "var(--admin-text)" }}
            title={currentLabel}
          >
            {currentLabel}
          </span>
        </nav>

        {/* Destra: feedback + anteprima + bottone Salva */}
        <div className="flex items-center gap-2 shrink-0">
          {savedAt && (
            <>
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
              <span
                className="sm:hidden flex items-center justify-center w-7 h-7 rounded-lg"
                style={{
                  color: "#22c55e",
                  background: "color-mix(in srgb, #22c55e 12%, var(--admin-card-bg))",
                }}
              >
                <Check size={13} />
              </span>
            </>
          )}

          {/* Bottone Anteprima — visibile solo se previewUrl è fornito */}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Anteprima pagina"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
              style={{
                color: "var(--admin-text-muted)",
                background: "var(--admin-card-bg)",
                border: "1px solid var(--admin-card-border, var(--admin-border))",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--admin-text)";
                e.currentTarget.style.borderColor = "var(--admin-text-muted)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--admin-text-muted)";
                e.currentTarget.style.borderColor = "var(--admin-card-border, var(--admin-border))";
              }}
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Anteprima</span>
            </a>
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
            <span className="sm:hidden">{isPending ? "…" : "Salva"}</span>
            <span className="hidden sm:inline">
              {isPending ? "Salvataggio…" : saveLabel}
            </span>
          </button>
        </div>
      </div>

      {/* Errore inline */}
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
