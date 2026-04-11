"use client";

import type { SeoPage } from "@/lib/db/schema";
import ConfirmModal, { type ConfirmModalProps } from "@/app/(admin)/admin/_components/confirm-modal";
import { FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteSeoPageAction } from "../actions";
import { SeoForm, resolvePreview } from "./seo-form";

// ─── Main list ────────────────────────────────────────────────────────────────
export default function SeoManager({
  initialPages,
  unconfiguredRoutes,
  domain,
  appName,
}: {
  initialPages: SeoPage[];
  unconfiguredRoutes: string[];
  domain: string;
  appName: string;
}) {
  const [search, setSearch] = useState("");
  const [editPage, setEditPage] = useState<SeoPage | null | "new">(null);
  const [modal, setModal] = useState<ConfirmModalProps | null>(null);
  const [isDeleting, startTransition] = useTransition();

  const filtered = initialPages.filter(
    (p) =>
      p.pathname.includes(search) ||
      p.label.toLowerCase().includes(search.toLowerCase()),
  );

  function handleDelete(pathname: string, label: string) {
    setModal({
      open: true,
      title: "Elimina configurazione SEO",
      message: (
        <div className="space-y-2">
          <p>
            Stai per eliminare la configurazione SEO associata a <strong>{label}</strong>.
          </p>
          <p>
            Path: <code style={{ color: "var(--admin-text)", fontFamily: "monospace" }}>{pathname}</code>
          </p>
          <p>L'operazione è irreversibile.</p>
        </div>
      ),
      variant: "danger",
      confirmLabel: "Elimina",
      cancelLabel: "Annulla",
      loading: isDeleting,
      onCancel: () => setModal(null),
      onConfirm: () => {
        startTransition(async () => {
          await deleteSeoPageAction(pathname);
          setModal(null);
        });
      },
    });
  }

  const allConfigured = unconfiguredRoutes.length === 0;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--admin-text-faint)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca pagina..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
            style={{
              background: "var(--admin-page-bg)",
              border: "1px solid var(--admin-input-border)",
              color: "var(--admin-text)",
            }}
          />
        </div>
        <button
          onClick={() => setEditPage("new")}
          disabled={allConfigured}
          title={
            allConfigured
              ? "Tutte le pagine sono già configurate"
              : "Aggiungi pagina"
          }
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--admin-accent)" }}
          onMouseEnter={(e) => {
            if (!allConfigured) e.currentTarget.style.filter = "brightness(0.9)";
          }}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          <Plus size={15} />
          Aggiungi pagina
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText
            size={36}
            className="mb-3"
            style={{ color: "var(--admin-text-faint)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--admin-text-muted)" }}
          >
            {search ? "Nessuna pagina trovata" : "Nessuna pagina configurata"}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--admin-text-faint)" }}
          >
            {!search && 'Clicca "Aggiungi pagina" per iniziare.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((page) => {
            const hasTitle = !!page.title;
            const hasDesc = !!page.description;
            const complete = hasTitle && hasDesc;
            const displayTitle = resolvePreview(page.title ?? "", appName);
            const displayDesc = resolvePreview(page.description ?? "", appName);
            return (
              <div
                key={page.pathname}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--admin-card-bg)",
                  border: "1px solid var(--admin-card-border)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor =
                    "var(--admin-input-border)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor =
                    "var(--admin-card-border)")
                }
              >
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: complete
                      ? "#22c55e"
                      : hasTitle || hasDesc
                      ? "#f59e0b"
                      : "var(--admin-text-faint)",
                  }}
                />

                {/* Label + path */}
                <div className="shrink-0 w-40 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {page.label}
                  </p>
                  <p
                    className="text-xs font-mono truncate"
                    style={{ color: "var(--admin-text-faint)" }}
                  >
                    {page.pathname}
                  </p>
                </div>

                {/* Title + desc preview */}
                <div className="hidden sm:block flex-1 min-w-0 overflow-hidden">
                  {displayTitle ? (
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {displayTitle}
                    </p>
                  ) : (
                    <p
                      className="text-xs italic"
                      style={{ color: "var(--admin-text-faint)" }}
                    >
                      Nessun titolo
                    </p>
                  )}
                  {displayDesc ? (
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--admin-text-faint)" }}
                    >
                      {displayDesc}
                    </p>
                  ) : (
                    <p
                      className="text-xs italic"
                      style={{ color: "var(--admin-text-faint)" }}
                    >
                      Nessuna descrizione
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {page.robots && (
                    <span
                      className="inline-flex text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{
                        background:
                          "color-mix(in srgb, #d97706 12%, var(--admin-card-bg))",
                        color: "#d97706",
                        border:
                          "1px solid color-mix(in srgb, #d97706 25%, transparent)",
                      }}
                    >
                      {page.robots}
                    </span>
                  )}
                  {page.jsonLdEnabled && page.jsonLdType && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{
                        background:
                          "color-mix(in srgb, #8b5cf6 12%, var(--admin-card-bg))",
                        color: "#8b5cf6",
                        border:
                          "1px solid color-mix(in srgb, #8b5cf6 25%, transparent)",
                      }}
                    >
                      {page.jsonLdType}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditPage(page)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "var(--admin-text-faint)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--admin-hover-bg)";
                      e.currentTarget.style.color = "var(--admin-text-muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--admin-text-faint)";
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(page.pathname, page.label)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "var(--admin-text-faint)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--admin-text-faint)";
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editPage !== null && (
        <SeoForm
          page={editPage === "new" ? null : editPage}
          domain={domain}
          appName={appName}
          unconfiguredRoutes={unconfiguredRoutes}
          onClose={() => setEditPage(null)}
        />
      )}

      {modal && <ConfirmModal {...modal} loading={isDeleting} />}
    </>
  );
}
