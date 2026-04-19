// app/(admin)/admin/route-registry/_components/route-registry-client.tsx
"use client";

import ConfirmModal from "@/app/(admin)/admin/_components/confirm-modal";
import type { RouteRegistry, RouteVisibility } from "@/lib/db/schema";
import {
  AlertTriangle,
  Lock,
  Map,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { useActionState, useState } from "react";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------
const HOME_PATH = "/";

// ---------------------------------------------------------------------------
// Stili condivisi
// ---------------------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  background:   "var(--admin-page-bg)",
  border:       "1px solid var(--admin-input-border)",
  color:        "var(--admin-text)",
  borderRadius: "0.5rem",
  padding:      "0.5rem 0.75rem",
  fontSize:     "0.875rem",
  width:        "100%",
  outline:      "none",
};

const labelStyle: React.CSSProperties = {
  fontSize:      "0.65rem",
  fontWeight:    600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color:         "var(--admin-text-muted)",
  display:       "block",
  marginBottom:  "0.375rem",
};

// ---------------------------------------------------------------------------
// Badge visibilità
// ---------------------------------------------------------------------------
const VIS_META: Record<RouteVisibility, { label: string; color: string; bg: string; border: string }> = {
  public:      { label: "public",    color: "#22c55e", bg: "color-mix(in srgb, #22c55e 10%, var(--admin-card-bg))",  border: "color-mix(in srgb, #22c55e 25%, transparent)" },
  "auth-only": { label: "auth-only", color: "#3b82f6", bg: "color-mix(in srgb, #3b82f6 10%, var(--admin-card-bg))",  border: "color-mix(in srgb, #3b82f6 25%, transparent)" },
  private:     { label: "private",   color: "#f59e0b", bg: "color-mix(in srgb, #f59e0b 10%, var(--admin-card-bg))",  border: "color-mix(in srgb, #f59e0b 25%, transparent)" },
  admin:       { label: "admin",     color: "#8b5cf6", bg: "color-mix(in srgb, #8b5cf6 10%, var(--admin-card-bg))",  border: "color-mix(in srgb, #8b5cf6 25%, transparent)" },
};

const VIS_FILTERS: Array<{ value: RouteVisibility | "all"; label: string }> = [
  { value: "all",       label: "Tutte" },
  { value: "public",    label: "public" },
  { value: "auth-only", label: "auth-only" },
  { value: "private",   label: "private" },
  { value: "admin",     label: "admin" },
];

function VisBadge({ vis }: { vis: RouteVisibility }) {
  const m = VIS_META[vis] ?? VIS_META.public;
  return (
    <span
      className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  );
}

function FilterPill({
  active,
  vis,
  count,
  onClick,
}: {
  active: boolean;
  vis: RouteVisibility | "all";
  count: number;
  onClick: () => void;
}) {
  const meta = vis === "all" ? null : VIS_META[vis];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: active
          ? meta ? meta.bg : "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))"
          : "var(--admin-page-bg)",
        color: active
          ? meta ? meta.color : "var(--admin-accent)"
          : "var(--admin-text-muted)",
        border: active
          ? `1px solid ${meta ? meta.border : "color-mix(in srgb, var(--admin-accent) 30%, transparent)"}`
          : "1px solid var(--admin-divider)",
      }}
    >
      {vis === "all" ? "Tutte" : vis}
      <span
        className="rounded-full px-1.5 py-0 text-xs"
        style={{
          background: active
            ? meta ? `color-mix(in srgb, ${meta.color} 20%, transparent)` : "color-mix(in srgb, var(--admin-accent) 20%, transparent)"
            : "var(--admin-divider)",
          color: active ? (meta ? meta.color : "var(--admin-accent)") : "var(--admin-text-faint)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Flag dot
// ---------------------------------------------------------------------------
function FlagDot({ active, title }: { active: boolean; title: string }) {
  return (
    <span
      title={title}
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: active ? "var(--admin-accent)" : "var(--admin-divider)" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------
type Props = {
  rows:               RouteRegistry[];
  upsertAction:       (prev: unknown, fd: FormData) => Promise<{ error?: string; success?: boolean; savedAt?: string }>;
  deleteAction:       (id: string) => Promise<{ error?: string; success?: boolean }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string; success?: boolean }>;
};

type FormMode = { type: "new" } | { type: "edit"; row: RouteRegistry };

type DeleteTarget = { id: string; pathname: string };

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------
export default function RouteRegistryClient({
  rows: initialRows,
  upsertAction,
  deleteAction,
  toggleActiveAction,
}: Props) {
  const [rows, setRows]             = useState<RouteRegistry[]>(initialRows);
  const [mode, setMode]             = useState<FormMode | null>(null);
  const [visFilter, setVisFilter]   = useState<RouteVisibility | "all">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [formState, formAction, isPending] = useActionState(
    async (prev: unknown, fd: FormData) => {
      const res = await upsertAction(prev, fd);
      if (res.success) window.location.reload();
      return res;
    },
    {},
  );

  // ── Filtro ────────────────────────────────────────────────────────────────
  const filtered = visFilter === "all"
    ? rows
    : rows.filter((r) => r.visibility === visFilter);

  const countByVis = (v: RouteVisibility) => rows.filter((r) => r.visibility === v).length;

  // ── Elimina con modale ────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteError(null);
    const res = await deleteAction(deleteTarget.id);
    if (res.error) {
      setDeleteError(res.error);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    }
    setDeletingId(null);
    setDeleteTarget(null);
  }

  // ── Toggle attiva/disattiva ───────────────────────────────────────────────
  async function handleToggle(row: RouteRegistry) {
    setTogglingId(row.id);
    const res = await toggleActiveAction(row.id, !row.isActive);
    if (!res.error) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, isActive: !r.isActive } : r)),
      );
    }
    setTogglingId(null);
  }

  const editRow = mode?.type === "edit" ? mode.row : null;

  return (
    <div className="space-y-5">

      {/* ── Confirm modal elimina ───────────────────────────────────────── */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Elimina route"
        message={
          <>
            Stai per eliminare la route{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: "0.8rem",
                padding: "1px 5px",
                borderRadius: "4px",
                background: "var(--admin-page-bg)",
                color: "var(--admin-text)",
              }}
            >
              {deleteTarget?.pathname}
            </code>
            .<br />
            <span style={{ marginTop: "6px", display: "block" }}>
              Questa operazione è irreversibile. Il proxy utilizzerà il fallback
              statico per questa route.
            </span>
          </>
        }
        variant="danger"
        confirmLabel="Elimina route"
        cancelLabel="Annulla"
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
              border:     "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
            }}
          >
            <Map size={18} style={{ color: "var(--admin-accent)" }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--admin-text)" }}>
              Route Registry
            </h1>
            <p className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
              {rows.length} route registrate
            </p>
          </div>
        </div>

        {mode === null && (
          <button
            type="button"
            onClick={() => setMode({ type: "new" })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
            style={{ background: "var(--admin-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            <Plus size={15} /> Aggiungi route
          </button>
        )}
      </div>

      {/* ── Filtri visibility ───────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterPill
            vis="all"
            active={visFilter === "all"}
            count={rows.length}
            onClick={() => setVisFilter("all")}
          />
          {(["public", "auth-only", "private", "admin"] as RouteVisibility[]).map((v) => (
            <FilterPill
              key={v}
              vis={v}
              active={visFilter === v}
              count={countByVis(v)}
              onClick={() => setVisFilter(v)}
            />
          ))}
        </div>
      )}

      {/* ── Form create / edit ──────────────────────────────────────────── */}
      {mode !== null && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
              {mode.type === "new" ? "Nuova route" : `Modifica — ${editRow?.pathname}`}
            </p>
            <button type="button" onClick={() => setMode(null)}>
              <X size={16} style={{ color: "var(--admin-text-muted)" }} />
            </button>
          </div>

          <form action={formAction} className="space-y-4">
            {editRow && <input type="hidden" name="id" value={editRow.id} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Pathname</label>
                <input
                  name="pathname"
                  defaultValue={editRow?.pathname ?? ""}
                  placeholder="/esempio"
                  required
                  style={{ ...inputStyle, fontFamily: "monospace" }}
                />
                <p style={{ fontSize: "0.7rem", color: "var(--admin-text-faint)", marginTop: "0.25rem" }}>
                  Deve iniziare con /
                </p>
              </div>
              <div>
                <label style={labelStyle}>Etichetta</label>
                <input
                  name="label"
                  defaultValue={editRow?.label ?? ""}
                  placeholder="Es. Dashboard"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label style={labelStyle}>Visibilità</label>
              <select
                name="visibility"
                defaultValue={editRow?.visibility ?? "public"}
                style={{ ...inputStyle, fontFamily: "inherit" }}
              >
                <option value="public">public — accessibile a tutti</option>
                <option value="auth-only">auth-only — solo per /sign-in, /sign-up</option>
                <option value="private">private — richiede login</option>
                <option value="admin">admin — solo amministratori</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Flag</label>
              <div className="flex flex-wrap gap-5">
                {([
                  { name: "inNav",     label: "In Nav",     key: "inNav" },
                  { name: "inFooter",  label: "In Footer",  key: "inFooter" },
                  { name: "inSitemap", label: "In Sitemap", key: "inSitemap" },
                  { name: "isActive",  label: "Attiva",     key: "isActive" },
                ] as const).map(({ name, label, key }) => {
                  const defaultVal = editRow
                    ? editRow[key as keyof RouteRegistry]
                    : name === "inSitemap" || name === "isActive";
                  return (
                    <label
                      key={name}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                      style={{ color: "var(--admin-text)" }}
                    >
                      <input
                        type="checkbox"
                        name={name}
                        value="true"
                        defaultChecked={!!defaultVal}
                        style={{ accentColor: "var(--admin-accent)" }}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>

            {(formState as { error?: string })?.error && (
              <p
                className="text-sm rounded-lg px-3 py-2"
                style={{
                  color: "#ef4444",
                  background: "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))",
                  border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)",
                }}
              >
                {(formState as { error?: string }).error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="px-4 py-1.5 text-sm rounded-lg"
                style={{ color: "var(--admin-text-muted)", border: "1px solid var(--admin-card-border)" }}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-60"
                style={{ background: "var(--admin-accent)" }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              >
                {isPending && (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {mode.type === "new" ? "Crea route" : "Salva"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Errore delete ────────────────────────────────────────────────── */}
      {deleteError && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: "color-mix(in srgb, #ef4444 8%, var(--admin-card-bg))",
            border:     "1px solid color-mix(in srgb, #ef4444 25%, transparent)",
          }}
        >
          <AlertTriangle size={14} style={{ color: "#ef4444" }} />
          <p className="text-sm" style={{ color: "#ef4444" }}>{deleteError}</p>
        </div>
      )}

      {/* ── Tabella ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center rounded-xl"
          style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
        >
          <Map size={32} className="mb-3" style={{ color: "var(--admin-text-faint)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>
            {visFilter === "all" ? "Nessuna route registrata" : `Nessuna route con visibilità «${visFilter}»`}
          </p>
          {visFilter !== "all" && (
            <button
              type="button"
              onClick={() => setVisFilter("all")}
              className="mt-3 text-xs underline"
              style={{ color: "var(--admin-accent)" }}
            >
              Mostra tutte
            </button>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
        >
          {/* Header colonne */}
          <div
            className="grid items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
            style={{
              gridTemplateColumns: "1fr auto auto auto auto",
              color:        "var(--admin-text-faint)",
              borderBottom: "1px solid var(--admin-divider)",
              background:   "var(--admin-page-bg)",
            }}
          >
            <span>Pathname / Etichetta</span>
            <span>Visibilità</span>
            <span title="In Nav / Footer / Sitemap" className="text-center">N · F · S</span>
            <span>Stato</span>
            <span />
          </div>

          {/* Righe */}
          {filtered.map((row, i) => {
            const isHome     = row.pathname === HOME_PATH;
            const isToggling = togglingId === row.id;
            const isDeleting = deletingId === row.id;

            return (
              <div
                key={row.id}
                className="grid items-center gap-3 px-4 py-3 text-sm"
                style={{
                  gridTemplateColumns: "1fr auto auto auto auto",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--admin-divider)" : "none",
                  background:   row.isActive ? "transparent" : "color-mix(in srgb, #ef4444 4%, var(--admin-card-bg))",
                  opacity:      row.isActive ? 1 : 0.65,
                }}
              >
                {/* Pathname + label */}
                <div className="min-w-0 flex items-center gap-2">
                  <div className="min-w-0">
                    <code
                      className="text-xs font-mono block truncate"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {row.pathname}
                    </code>
                    <span
                      className="text-xs truncate block"
                      style={{ color: "var(--admin-text-faint)" }}
                    >
                      {row.label}
                    </span>
                  </div>
                  {/* Icona lucchetto per la home */}
                  {isHome && (
                    <span
                      title="La home / è protetta e non può essere disattivata o eliminata"
                      className="flex-shrink-0"
                      style={{ color: "var(--admin-text-faint)" }}
                    >
                      <Lock size={11} />
                    </span>
                  )}
                </div>

                {/* Visibility badge */}
                <VisBadge vis={row.visibility as RouteVisibility} />

                {/* Flag Nav · Footer · Sitemap */}
                <div className="flex items-center gap-1.5">
                  <FlagDot active={row.inNav}     title="In Nav" />
                  <FlagDot active={row.inFooter}  title="In Footer" />
                  <FlagDot active={row.inSitemap} title="In Sitemap" />
                </div>

                {/* Toggle attiva/disattiva — disabilitato per home */}
                <button
                  type="button"
                  title={
                    isHome
                      ? "La home non può essere disattivata"
                      : row.isActive ? "Disattiva" : "Attiva"
                  }
                  disabled={isHome || isToggling}
                  onClick={() => handleToggle(row)}
                  className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: row.isActive && !isHome ? "var(--admin-accent)" : "var(--admin-text-faint)" }}
                  onMouseEnter={(e) => { if (!isHome) e.currentTarget.style.opacity = "0.7"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  {isToggling
                    ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
                    : <Power size={13} />}
                </button>

                {/* Azioni modifica / elimina */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Modifica"
                    onClick={() => setMode({ type: "edit", row })}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "var(--admin-text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted)")}
                  >
                    <Pencil size={13} />
                  </button>

                  {/* Elimina — disabilitato per home */}
                  <button
                    type="button"
                    title={isHome ? "La home non può essere eliminata" : "Elimina"}
                    disabled={isHome || isDeleting}
                    onClick={() =>
                      setDeleteTarget({ id: row.id, pathname: row.pathname })
                    }
                    className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: "var(--admin-text-muted)" }}
                    onMouseEnter={(e) => { if (!isHome) e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted)")}
                  >
                    {isDeleting
                      ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
