"use client";

import type { Page } from "@/lib/db/schema";
import {
  FileText,
  Globe,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePageAction } from "../actions";

export default function PageManager({
  initialPages,
}: {
  initialPages: Page[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const filtered = initialPages.filter(
    (p) =>
      p.slug.includes(search) ||
      p.title.toLowerCase().includes(search.toLowerCase()),
  );

  function handleDelete(slug: string, title: string) {
    if (
      !confirm(
        `Eliminare la pagina "${title}"?\n\nL'URL /${slug} non sarà più disponibile.`,
      )
    )
      return;
    startTransition(async () => {
      await deletePageAction(slug);
      router.refresh();
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
          onClick={() => router.push("/admin/contenuti/new")}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors"
          style={{ background: "var(--admin-accent)" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
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
          <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>
            {search ? "Nessuna pagina trovata" : "Nessuna pagina creata"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--admin-text-faint)" }}>
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
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: isPublished ? "#22c55e" : "var(--admin-text-faint)" }}
                />
                <div className="shrink-0 w-44 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--admin-text)" }}>
                    {page.title}
                  </p>
                  <p className="text-xs font-mono truncate" style={{ color: "var(--admin-text-faint)" }}>
                    /{page.slug}
                  </p>
                </div>
                <div className="hidden sm:block flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs truncate" style={{ color: "var(--admin-text-faint)" }}>
                    {page.content
                      ? page.content.replace(/<[^>]+>/g, " ").trim().slice(0, 120)
                      : "Nessun contenuto"}
                  </p>
                </div>
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
                    {isPublished ? <><Globe size={11} /> Pubblicata</> : <>Bozza</>}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/admin/contenuti/${page.slug}/edit`)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "var(--admin-text-faint)" }}
                    title="Modifica"
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
                    title="Elimina"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))";
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
    </>
  );
}
