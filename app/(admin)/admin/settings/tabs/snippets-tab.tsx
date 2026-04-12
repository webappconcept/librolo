// app/(admin)/admin/settings/tabs/snippets-tab.tsx
"use client";

import type { SiteSnippet, SnippetPosition, SnippetType } from "@/lib/db/schema";
import {
  Code2,
  ExternalLink,
  FileCode2,
  Globe,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, useOptimistic } from "react";
import {
  createSnippetAction,
  updateSnippetAction,
  deleteSnippetAction,
  toggleSnippetAction,
} from "../actions";

// ─── Costanti UI ────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<SnippetType, string> = {
  link_css: "CSS esterno (link)",
  style: "CSS inline (style)",
  script_src: "JS esterno (script src)",
  script: "JS inline (script)",
  raw: "Codice arbitrario",
};

const TYPE_ICONS: Record<SnippetType, React.ReactNode> = {
  link_css: <Globe size={13} />,
  style: <FileCode2 size={13} />,
  script_src: <ExternalLink size={13} />,
  script: <Code2 size={13} />,
  raw: <FileCode2 size={13} />,
};

const POSITION_LABELS: Record<SnippetPosition, string> = {
  head: "<head>",
  body_end: "Fine <body>",
};

const CONTENT_PLACEHOLDER: Record<SnippetType, string> = {
  link_css: "https://fonts.bunny.net/css?family=...",
  style: "body { font-family: 'Inter', sans-serif; }",
  script_src: "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX",
  script: "window.dataLayer = window.dataLayer || [];\nfunction gtag(){...}",
  raw: "<meta name=\"google-site-verification\" content=\"...\" />",
};

// ─── Form modale ─────────────────────────────────────────────────────────────
function SnippetForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<SiteSnippet>;
  onSave: (data: Omit<SiteSnippet, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<SnippetType>((initial?.type as SnippetType) ?? "script");
  const [position, setPosition] = useState<SnippetPosition>(
    (initial?.position as SnippetPosition) ?? "head",
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const isUrl = type === "link_css" || type === "script_src";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    onSave({ name, type, position, content, isActive, sortOrder: initial?.sortOrder ?? 0 });
  }

  const fieldStyle = {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    borderRadius: "8px",
    background: "var(--admin-input-bg)",
    border: "1px solid var(--admin-input-border)",
    color: "var(--admin-text)",
    outline: "none",
  } as React.CSSProperties;

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 500,
    marginBottom: "4px",
    color: "var(--admin-text-muted)",
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl p-6 w-full max-w-lg space-y-4"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {initial?.id ? "Modifica snippet" : "Nuovo snippet"}
          </h3>
          <button type="button" onClick={onCancel} style={{ color: "var(--admin-text-faint)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Nome */}
        <div>
          <label style={labelStyle}>Nome (solo admin)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Google Analytics, Meta Pixel…"
            required
            style={fieldStyle}
          />
        </div>

        {/* Tipo + Posizione in griglia */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SnippetType)}
              style={fieldStyle}
            >
              {(Object.keys(TYPE_LABELS) as SnippetType[]).map((k) => (
                <option key={k} value={k}>{TYPE_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Posizione</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as SnippetPosition)}
              style={fieldStyle}
            >
              <option value="head">&lt;head&gt;</option>
              <option value="body_end">Fine &lt;body&gt;</option>
            </select>
          </div>
        </div>

        {/* Contenuto */}
        <div>
          <label style={labelStyle}>
            {isUrl ? "URL" : "Codice"}
          </label>
          {isUrl ? (
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={CONTENT_PLACEHOLDER[type]}
              required
              style={fieldStyle}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={CONTENT_PLACEHOLDER[type]}
              required
              rows={6}
              style={{
                ...fieldStyle,
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            />
          )}
        </div>

        {/* Attivo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            style={{ color: isActive ? "var(--admin-accent)" : "var(--admin-text-faint)" }}
          >
            {isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          </button>
          <span className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
            {isActive ? "Attivo — verrà iniettato nel frontend" : "Inattivo — salvato ma non iniettato"}
          </span>
        </div>

        {/* Bottoni */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{
              background: "var(--admin-input-bg)",
              border: "1px solid var(--admin-border)",
              color: "var(--admin-text-muted)",
            }}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ background: "var(--admin-accent)", opacity: loading ? 0.7 : 1 }}
          >
            <Save size={14} />
            {loading ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Riga snippet ────────────────────────────────────────────────────────────
function SnippetRow({
  snippet,
  onEdit,
  onDelete,
  onToggle,
  pendingId,
}: {
  snippet: SiteSnippet;
  onEdit: (s: SiteSnippet) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, current: boolean) => void;
  pendingId: number | null;
}) {
  const isPending = pendingId === snippet.id;
  const t = snippet.type as SnippetType;
  const p = snippet.position as SnippetPosition;

  const previewContent =
    snippet.content.length > 60
      ? snippet.content.slice(0, 60) + "…"
      : snippet.content;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
        opacity: isPending ? 0.6 : snippet.isActive ? 1 : 0.55,
        transition: "opacity 160ms ease",
      }}
    >
      {/* Drag handle (visivo) */}
      <GripVertical size={14} style={{ color: "var(--admin-text-faint)", flexShrink: 0, cursor: "grab" }} />

      {/* Icona tipo */}
      <span style={{ color: "var(--admin-accent)", flexShrink: 0 }}>
        {TYPE_ICONS[t]}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
            {snippet.name}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              background: "color-mix(in srgb, var(--admin-accent) 10%, var(--admin-card-bg))",
              color: "var(--admin-accent)",
              border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
            }}
          >
            {TYPE_LABELS[t]}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              background: "color-mix(in srgb, var(--admin-text-faint) 12%, var(--admin-card-bg))",
              color: "var(--admin-text-muted)",
              border: "1px solid color-mix(in srgb, var(--admin-text-faint) 20%, transparent)",
            }}
          >
            {POSITION_LABELS[p]}
          </span>
          {!snippet.isActive && (
            <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>inattivo</span>
          )}
        </div>
        <p
          className="text-xs font-mono mt-0.5 truncate"
          style={{ color: "var(--admin-text-faint)" }}
        >
          {previewContent}
        </p>
      </div>

      {/* Azioni */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Toggle attivo */}
        <button
          onClick={() => onToggle(snippet.id, snippet.isActive)}
          disabled={isPending}
          title={snippet.isActive ? "Disattiva" : "Attiva"}
          style={{
            color: snippet.isActive ? "var(--admin-accent)" : "var(--admin-text-faint)",
            padding: "4px",
            borderRadius: "6px",
            display: "flex",
          }}
        >
          {snippet.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>

        {/* Modifica */}
        <button
          onClick={() => onEdit(snippet)}
          title="Modifica"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--admin-text-faint)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--admin-hover-bg)"; e.currentTarget.style.color = "var(--admin-text-muted)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--admin-text-faint)"; }}
        >
          <Pencil size={13} />
        </button>

        {/* Elimina */}
        <button
          onClick={() => onDelete(snippet.id)}
          title="Elimina"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--admin-text-faint)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--admin-text-faint)"; }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Tab principale ───────────────────────────────────────────────────────────
export function SnippetsTab({ initialSnippets }: { initialSnippets: SiteSnippet[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [snippets, setSnippets] = useOptimistic(initialSnippets);
  const [editTarget, setEditTarget] = useState<SiteSnippet | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function handleSave(
    data: Omit<SiteSnippet, "id" | "createdAt" | "updatedAt">,
  ) {
    setFormLoading(true);
    if (editTarget) {
      await updateSnippetAction(editTarget.id, data);
    } else {
      await createSnippetAction(data);
    }
    setFormLoading(false);
    setShowForm(false);
    setEditTarget(null);
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminare questo snippet?")) return;
    setPendingId(id);
    await deleteSnippetAction(id);
    setPendingId(null);
    startTransition(() => router.refresh());
  }

  async function handleToggle(id: number, current: boolean) {
    setPendingId(id);
    // Ottimistico: aggiorna subito la lista locale
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !current } : s)),
    );
    await toggleSnippetAction(id, !current);
    setPendingId(null);
    startTransition(() => router.refresh());
  }

  const headSnippets = snippets.filter((s) => s.position === "head");
  const bodySnippets = snippets.filter((s) => s.position === "body_end");

  function SectionTitle({ label, count }: { label: string; count: number }) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
          {label}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--admin-text-faint) 12%, var(--admin-card-bg))",
            color: "var(--admin-text-faint)",
          }}
        >
          {count}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            Snippet globali
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
            CSS, JavaScript e markup iniettati in tutte le pagine frontend (Google Analytics,
            Meta Pixel, font esterni, Search Console, ecc.)
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shrink-0 transition-colors"
          style={{ background: "var(--admin-accent)" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          <Plus size={14} /> Aggiungi snippet
        </button>
      </div>

      {/* Liste per posizione */}
      {snippets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl text-center"
          style={{
            border: "1px dashed var(--admin-card-border)",
            background: "var(--admin-card-bg)",
          }}
        >
          <Code2 size={28} className="mb-3" style={{ color: "var(--admin-text-faint)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>
            Nessuno snippet configurato
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--admin-text-faint)" }}>
            Aggiungi Analytics, Meta Pixel, font o qualsiasi codice globale.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {headSnippets.length > 0 && (
            <div>
              <SectionTitle label="Head" count={headSnippets.length} />
              <div className="space-y-2">
                {headSnippets.map((s) => (
                  <SnippetRow
                    key={s.id}
                    snippet={s}
                    onEdit={(s) => { setEditTarget(s); setShowForm(true); }}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                    pendingId={pendingId}
                  />
                ))}
              </div>
            </div>
          )}
          {bodySnippets.length > 0 && (
            <div>
              <SectionTitle label="Fine body" count={bodySnippets.length} />
              <div className="space-y-2">
                {bodySnippets.map((s) => (
                  <SnippetRow
                    key={s.id}
                    snippet={s}
                    onEdit={(s) => { setEditTarget(s); setShowForm(true); }}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                    pendingId={pendingId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form modale */}
      {showForm && (
        <SnippetForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
          loading={formLoading}
        />
      )}
    </div>
  );
}
