"use client";

import type { Page } from "@/lib/db/schema";
import {
  FileText,
  Globe,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deletePageAction, upsertPageAction } from "../actions";

const inputStyle = {
  background: "var(--admin-page-bg)",
  border: "1px solid var(--admin-input-border)",
  color: "var(--admin-text)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
} as React.CSSProperties;

const labelStyle = {
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "var(--admin-text-muted)",
};

const hintStyle = {
  fontSize: "0.75rem",
  color: "var(--admin-text-faint)",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

// ─── Modal Form ───────────────────────────────────────────────────────────────
function PageForm({
  page,
  onClose,
}: {
  page?: Page | null;
  onClose: () => void;
}) {
  const isEdit = !!page;
  const [state, action, isPending] = useActionState(upsertPageAction, {});

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugManual, setSlugManual] = useState(isEdit);
  const [content, setContent] = useState(page?.content ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (page?.status as "draft" | "published") ?? "draft",
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) setSlug(slugify(val));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--admin-divider)" }}
        >
          <h2 className="font-semibold" style={{ color: "var(--admin-text)" }}>
            {isEdit ? "Modifica pagina" : "Nuova pagina"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
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
            <X size={18} />
          </button>
        </div>

        <form action={action} className="px-6 py-5 space-y-5">
          {isEdit && (
            <input type="hidden" name="originalSlug" value={page!.slug} />
          )}

          {/* Titolo */}
          <div className="space-y-1.5">
            <label style={labelStyle}>Titolo pagina</label>
            <input
              name="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Es. Chi siamo"
              style={inputStyle}
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label style={labelStyle}>Slug (URL)</label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setSlugManual((v) => !v)}
                  className="text-xs transition-colors"
                  style={{ color: "var(--admin-accent)" }}
                >
                  {slugManual ? "Auto" : "Modifica manualmente"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-0">
              <span
                className="px-3 py-2 text-sm rounded-l-lg shrink-0"
                style={{
                  background: "var(--admin-hover-bg)",
                  border: "1px solid var(--admin-input-border)",
                  borderRight: "none",
                  color: "var(--admin-text-faint)",
                }}
              >
                /
              </span>
              <input
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManual(true);
                }}
                placeholder="chi-siamo"
                readOnly={isEdit}
                style={{
                  ...inputStyle,
                  borderRadius: "0 0.5rem 0.5rem 0",
                  fontFamily: "monospace",
                  background: isEdit ? "var(--admin-hover-bg)" : inputStyle.background,
                  color: isEdit ? "var(--admin-text-muted)" : inputStyle.color,
                }}
              />
            </div>
            {isEdit ? (
              <p style={hintStyle}>Lo slug non può essere modificato dopo la creazione.</p>
            ) : (
              <p style={hintStyle}>
                L&apos;URL pubblico sarà: <strong style={{ color: "var(--admin-text-muted)" }}>/{slug || "slug-pagina"}</strong>
              </p>
            )}
          </div>

          {/* Contenuto */}
          <div className="space-y-1.5">
            <label style={labelStyle}>Contenuto</label>
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Contenuto della pagina..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: "0.8125rem" }}
            />
            <p style={hintStyle}>Puoi usare HTML o testo semplice.</p>
          </div>

          {/* Stato */}
          <div
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
            style={{
              background: "var(--admin-hover-bg)",
              border: "1px solid var(--admin-card-border)",
            }}
          >
            <div>
              <p style={labelStyle}>Stato pubblicazione</p>
              <p style={{ ...hintStyle, marginTop: "0.125rem" }}>
                {status === "published"
                  ? "La pagina è visibile pubblicamente su /${slug || 'slug'}"
                  : "La pagina non è ancora visibile al pubblico"}
              </p>
            </div>
            <input type="hidden" name="status" value={status} />
            <button
              type="button"
              onClick={() =>
                setStatus((v) => (v === "published" ? "draft" : "published"))
              }
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0"
              style={{
                background:
                  status === "published"
                    ? "color-mix(in srgb, #22c55e 15%, var(--admin-card-bg))"
                    : "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
                color: status === "published" ? "#22c55e" : "var(--admin-accent)",
                border:
                  status === "published"
                    ? "1px solid color-mix(in srgb, #22c55e 30%, transparent)"
                    : "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
              }}
            >
              {status === "published" ? (
                <><Eye size={14} /> Pubblicata</>
              ) : (
                <><EyeOff size={14} /> Bozza</>
              )}
            </button>
          </div>

          {/* SEO hint */}
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5"
            style={{
              background:
                "color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg))",
              border:
                "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
            }}
          >
            <Info size={13} className="mt-0.5 shrink-0" style={{ color: "var(--admin-accent)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
              I meta SEO (title, description, OG…) si configurano nella sezione{" "}
              <strong>SEO → Meta Tags</strong>. Dopo aver pubblicato questa pagina,
              comparirà automaticamente nella lista dei percorsi disponibili.
            </p>
          </div>

          {/* Error */}
          {state?.error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                color: "var(--admin-error, #ef4444)",
                background: "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))",
                border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)",
              }}
            >
              {state.error}
            </p>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-3 pt-2"
            style={{ borderTop: "1px solid var(--admin-divider)" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
              style={{
                border: "1px solid var(--admin-input-border)",
                color: "var(--admin-text-muted)",
                background: "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--admin-hover-bg)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-60"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.filter = "brightness(0.9)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              {isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {isEdit ? "Salva modifiche" : "Crea pagina"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────
export default function PageManager({
  initialPages,
}: {
  initialPages: Page[];
}) {
  const [search, setSearch] = useState("");
  const [editPage, setEditPage] = useState<Page | null | "new">(null);
  const [, startTransition] = useTransition();

  const filtered = initialPages.filter(
    (p) =>
      p.slug.includes(search) ||
      p.title.toLowerCase().includes(search.toLowerCase()),
  );

  function handleDelete(slug: string, title: string) {
    if (!confirm(`Eliminare la pagina "${title}"?\n\nL'URL /${slug} non sarà più disponibile.`)) return;
    startTransition(async () => {
      await deletePageAction(slug);
    });
  }

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
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors"
          style={{ background: "var(--admin-accent)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.filter = "brightness(0.9)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          <Plus size={15} />
          Nuova pagina
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
            {search ? "Nessuna pagina trovata" : "Nessuna pagina creata"}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--admin-text-faint)" }}
          >
            {!search && 'Clicca "Nuova pagina" per iniziare.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((page) => {
            const isPublished = page.status === "published";
            return (
              <div
                key={page.slug}
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
                    background: isPublished
                      ? "#22c55e"
                      : "var(--admin-text-faint)",
                  }}
                />

                {/* Slug + titolo */}
                <div className="shrink-0 w-44 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {page.title}
                  </p>
                  <p
                    className="text-xs font-mono truncate"
                    style={{ color: "var(--admin-text-faint)" }}
                  >
                    /{page.slug}
                  </p>
                </div>

                {/* Preview contenuto */}
                <div className="hidden sm:block flex-1 min-w-0 overflow-hidden">
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--admin-text-faint)" }}
                  >
                    {page.content
                      ? page.content.replace(/<[^>]+>/g, " ").trim().slice(0, 100)
                      : <em>Nessun contenuto</em>}
                  </p>
                </div>

                {/* Badge stato */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{
                      background: isPublished
                        ? "color-mix(in srgb, #22c55e 12%, var(--admin-card-bg))"
                        : "color-mix(in srgb, var(--admin-text-faint) 15%, var(--admin-card-bg))",
                      color: isPublished ? "#22c55e" : "var(--admin-text-muted)",
                      border: isPublished
                        ? "1px solid color-mix(in srgb, #22c55e 25%, transparent)"
                        : "1px solid color-mix(in srgb, var(--admin-text-faint) 25%, transparent)",
                    }}
                  >
                    {isPublished ? (
                      <><Globe size={11} /> Pubblicata</>
                    ) : (
                      <>Bozza</>
                    )}
                  </span>
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
                    onClick={() => handleDelete(page.slug, page.title)}
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
        <PageForm
          page={editPage === "new" ? null : editPage}
          onClose={() => setEditPage(null)}
        />
      )}
    </>
  );
}
