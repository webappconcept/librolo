"use client";

import ConfirmModal from "@/app/(admin)/admin/_components/confirm-modal";
import Tooltip from "@/app/(admin)/admin/_components/tooltip";
import type { Page, PageTemplate } from "@/lib/db/schema";
import { ChevronRight, EyeOff, FileText, GitFork, Globe, PanelTop, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePageAction, togglePageStatusAction } from "../actions";

type TemplateWithFields = PageTemplate & { fields: import("@/lib/db/schema").TemplateField[] };

interface DeleteTarget {
  slug: string;
  title: string;
  /** Numero totale di discendenti (figli + nipoti + …) */
  descendants: number;
}

// ─── PageRow ──────────────────────────────────────────────────────────────────
function PageRow({
  page,
  allPages,
  templates,
  depth,
  expandedIds,
  toggleExpand,
  onEdit,
  onDeleteRequest,
  onNewChild,
  onToggleStatus,
  pendingToggleId,
  searchActive,
}: {
  page: Page;
  allPages: Page[];
  templates: TemplateWithFields[];
  depth: number;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onEdit: (id: number) => void;
  onDeleteRequest: (target: DeleteTarget) => void;
  onNewChild: (id: number) => void;
  onToggleStatus: (id: number, status: string) => void;
  pendingToggleId: number | null;
  searchActive: boolean;
}) {
  const children = allPages.filter((p) => p.parentId === page.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(page.id);
  const isPublished = page.status === "published";
  const tplName = templates.find((t) => t.id === page.templateId)?.name;
  const isPendingToggle = pendingToggleId === page.id;
  const indent = depth * 20;

  /** Conta ricorsivamente tutti i discendenti dalla lista già in memoria */
  function countDescendants(id: number): number {
    const direct = allPages.filter((p) => p.parentId === id);
    return direct.reduce((acc, child) => acc + 1 + countDescendants(child.id), 0);
  }

  function handleRowClick() {
    if (hasChildren) toggleExpand(page.id);
  }

  function stopRow(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <>
      <div
        onClick={handleRowClick}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors group"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
          marginLeft: `${indent}px`,
          opacity: isPendingToggle ? 0.6 : 1,
          transition: "opacity 160ms ease, border-color 160ms ease",
          cursor: hasChildren ? "pointer" : "default",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--admin-input-border)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--admin-card-border)")}
      >
        {/* Chevron — visuale puro */}
        <span
          className="flex items-center justify-center w-6 h-6 rounded shrink-0"
          style={{ color: hasChildren ? "var(--admin-text-muted)" : "transparent" }}
        >
          <ChevronRight
            size={14}
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 160ms ease",
            }}
          />
        </span>

        {/* Children count badge */}
        {hasChildren ? (
          <span
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 transition-colors"
            style={{
              background: isExpanded
                ? "color-mix(in srgb, var(--admin-accent) 14%, var(--admin-card-bg))"
                : "color-mix(in srgb, var(--admin-text-faint) 14%, var(--admin-card-bg))",
              color: isExpanded ? "var(--admin-accent)" : "var(--admin-text-muted)",
              border: isExpanded
                ? "1px solid color-mix(in srgb, var(--admin-accent) 28%, transparent)"
                : "1px solid color-mix(in srgb, var(--admin-text-faint) 22%, transparent)",
              minWidth: "28px",
              justifyContent: "center",
            }}
          >
            +{children.length}
          </span>
        ) : (
          <span className="w-7 shrink-0" />
        )}

        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0 transition-colors"
          style={{ background: isPublished ? "#22c55e" : "var(--admin-text-faint)" }}
        />

        {/* Title + slug */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--admin-text)" }}>
            {page.title}
          </p>
          <p className="text-xs font-mono truncate" style={{ color: "var(--admin-text-faint)" }}>
            /{page.slug}
          </p>
        </div>

        {/* Template badge */}
        {tplName && (
          <span
            className="hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: "color-mix(in srgb, var(--admin-accent) 10%, var(--admin-card-bg))",
              color: "var(--admin-accent)",
              border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
            }}
          >
            <PanelTop size={10} />
            {tplName}
          </span>
        )}

        {/* Status badge */}
        <span
          className="hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 whitespace-nowrap transition-all"
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
          {isPublished ? <><Globe size={10} /> Pubblicata</> : <>Bozza</>}
        </span>

        {/* Actions — stopPropagation evita toggle riga */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={stopRow}>

          <Tooltip label="Nuova pagina figlia" side="top">
            <button
              onClick={() => onNewChild(page.id)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--admin-text-faint)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, var(--admin-accent) 10%, var(--admin-card-bg))";
                e.currentTarget.style.color = "var(--admin-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--admin-text-faint)";
              }}
            >
              <GitFork size={13} />
            </button>
          </Tooltip>

          <Tooltip label="Modifica pagina" side="top">
            <button
              onClick={() => onEdit(page.id)}
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
              <Pencil size={13} />
            </button>
          </Tooltip>

          <Tooltip label={isPublished ? "Depubblica" : "Pubblica"} side="top">
            <button
              onClick={() => onToggleStatus(page.id, page.status)}
              disabled={isPendingToggle}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: isPublished ? "#22c55e" : "var(--admin-text-faint)" }}
              onMouseEnter={(e) => {
                if (isPublished) {
                  e.currentTarget.style.background = "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))";
                  e.currentTarget.style.color = "#ef4444";
                } else {
                  e.currentTarget.style.background = "color-mix(in srgb, #22c55e 10%, var(--admin-card-bg))";
                  e.currentTarget.style.color = "#22c55e";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isPublished ? "#22c55e" : "var(--admin-text-faint)";
              }}
            >
              {isPendingToggle ? (
                <span
                  className="block w-3 h-3 border border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
                />
              ) : isPublished ? (
                <EyeOff size={13} />
              ) : (
                <Globe size={13} />
              )}
            </button>
          </Tooltip>

          <Tooltip label="Elimina pagina" side="top">
            <button
              onClick={() =>
                onDeleteRequest({
                  slug: page.slug,
                  title: page.title,
                  descendants: countDescendants(page.id),
                })
              }
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--admin-text-faint)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--admin-text-faint)";
              }}
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>

        </div>
      </div>

      {/* Children */}
      {(isExpanded || searchActive) &&
        children.map((child) => (
          <PageRow
            key={child.id}
            page={child}
            allPages={allPages}
            templates={templates}
            depth={depth + 1}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onEdit={onEdit}
            onDeleteRequest={onDeleteRequest}
            onNewChild={onNewChild}
            onToggleStatus={onToggleStatus}
            pendingToggleId={pendingToggleId}
            searchActive={searchActive}
          />
        ))}
    </>
  );
}

// ─── PageManager ──────────────────────────────────────────────────────────────
export default function PageManager({
  initialPages,
  templates,
}: {
  initialPages: Page[];
  templates: TemplateWithFields[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [, startTransition] = useTransition();

  const searchActive = search.trim().length > 0;

  const visiblePages: Page[] = searchActive
    ? (() => {
        const q = search.toLowerCase();
        const matched = new Set(
          initialPages
            .filter((p) => p.title.toLowerCase().includes(q) || p.slug.includes(q))
            .map((p) => p.id),
        );
        const toShow = new Set(matched);
        for (const page of initialPages) {
          if (!matched.has(page.id)) continue;
          let cur: Page | undefined = page;
          while (cur?.parentId) {
            toShow.add(cur.parentId);
            cur = initialPages.find((p) => p.id === cur!.parentId);
          }
        }
        return initialPages.filter((p) => toShow.has(p.id));
      })()
    : initialPages;

  const visibleIds = new Set(visiblePages.map((p) => p.id));
  const rootPages = visiblePages.filter((p) => !p.parentId || !visibleIds.has(p.parentId));

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await deletePageAction(deleteTarget.slug);
    setDeleteLoading(false);
    setDeleteTarget(null);
    startTransition(() => router.refresh());
  }

  function handleToggleStatus(id: number, currentStatus: string) {
    setPendingToggleId(id);
    startTransition(async () => {
      await togglePageStatusAction(id, currentStatus);
      router.refresh();
      setPendingToggleId(null);
    });
  }

  // Messaggio dinamico per la modale di eliminazione
  function buildDeleteMessage(target: DeleteTarget): React.ReactNode {
    return (
      <span>
        Stai per eliminare la pagina{" "}
        <strong style={{ color: "var(--admin-text, #cdccca)" }}>{target.title}</strong>
        {" "}(<code style={{ fontSize: "12px" }}>/{target.slug}</code>).
        {target.descendants > 0 && (
          <>
            <br /><br />
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "8px",
              background: "rgba(220,38,38,0.1)",
              color: "#f87171",
              fontSize: "13px",
              fontWeight: 500,
            }}>
              ⚠️ Verranno eliminate anche{" "}
              <strong>{target.descendants}</strong>{" "}
              {target.descendants === 1 ? "pagina figlia" : "pagine figlie"}.
            </span>
          </>
        )}
        <br /><br />
        <span style={{ fontSize: "13px" }}>Questa operazione è <strong>irreversibile</strong>.</span>
      </span>
    );
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
        {expandedIds.size > 0 && !searchActive && (
          <button
            onClick={() => setExpandedIds(new Set())}
            className="text-xs px-3 py-2 rounded-lg transition-colors"
            style={{
              color: "var(--admin-text-muted)",
              border: "1px solid var(--admin-card-border)",
              background: "var(--admin-card-bg)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--admin-input-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--admin-card-border)")}
          >
            Comprimi tutto
          </button>
        )}
        <button
          onClick={() => router.push("/admin/contenuti/new")}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors"
          style={{ background: "var(--admin-accent)" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          <Plus size={15} /> Nuova pagina
        </button>
      </div>

      {/* Empty state */}
      {rootPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={36} className="mb-3" style={{ color: "var(--admin-text-faint)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>
            {searchActive ? "Nessuna pagina trovata" : "Nessuna pagina creata"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--admin-text-faint)" }}>
            {!searchActive && 'Clicca "Nuova pagina" per iniziare.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rootPages.map((page) => (
            <PageRow
              key={page.id}
              page={page}
              allPages={visiblePages}
              templates={templates}
              depth={0}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onEdit={(id) => router.push(`/admin/contenuti/${id}/edit`)}
              onDeleteRequest={setDeleteTarget}
              onNewChild={(id) => router.push(`/admin/contenuti/new?parentId=${id}`)}
              onToggleStatus={handleToggleStatus}
              pendingToggleId={pendingToggleId}
              searchActive={searchActive}
            />
          ))}
        </div>
      )}

      {/* Modale di conferma eliminazione */}
      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          title="Elimina pagina"
          message={buildDeleteMessage(deleteTarget)}
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
