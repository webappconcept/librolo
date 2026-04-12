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
  Wand2,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, useOptimistic } from "react";
import {
  createSnippetAction,
  updateSnippetAction,
  deleteSnippetAction,
  toggleSnippetAction,
} from "../actions";

// ---------------------------------------------------------------------------
// Costanti UI
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Modelli predefiniti
// ---------------------------------------------------------------------------
type PresetStep = {
  name: string;
  type: SnippetType;
  position: SnippetPosition;
  /** Contenuto con placeholder ${ID} / ${PIXEL_ID} / ecc. */
  content: string;
};

type Preset = {
  id: string;
  label: string;
  description: string;
  /** Variabile che l'utente deve inserire (es. "Measurement ID") */
  paramLabel: string;
  paramPlaceholder: string;
  /** Icona testuale / emoji */
  icon: string;
  steps: PresetStep[];
};

const PRESETS: Preset[] = [
  {
    id: "ga4",
    label: "Google Analytics 4",
    description: "Tracciamento visite e conversioni via gtag.js",
    paramLabel: "Measurement ID",
    paramPlaceholder: "G-XXXXXXXXXX",
    icon: "📊",
    steps: [
      {
        name: "Google Analytics — script src",
        type: "script_src",
        position: "head",
        content: "https://www.googletagmanager.com/gtag/js?id=${ID}",
      },
      {
        name: "Google Analytics — config",
        type: "script",
        position: "head",
        content:
          "window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', '${ID}');",
      },
    ],
  },
  {
    id: "gtm",
    label: "Google Tag Manager",
    description: "Contenitore GTM per gestire tutti i tag da un'unica interfaccia",
    paramLabel: "Container ID",
    paramPlaceholder: "GTM-XXXXXXX",
    icon: "🏷️",
    steps: [
      {
        name: "GTM — head script",
        type: "script",
        position: "head",
        content:
          "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${ID}');",
      },
      {
        name: "GTM — noscript body",
        type: "raw",
        position: "body_end",
        content:
          "<noscript><iframe src=\"https://www.googletagmanager.com/ns.html?id=${ID}\" height=\"0\" width=\"0\" style=\"display:none;visibility:hidden\"></iframe></noscript>",
      },
    ],
  },
  {
    id: "meta_pixel",
    label: "Meta Pixel",
    description: "Tracciamento conversioni e pubblici personalizzati per Facebook/Instagram Ads",
    paramLabel: "Pixel ID",
    paramPlaceholder: "1234567890123456",
    icon: "🎯",
    steps: [
      {
        name: "Meta Pixel — base code",
        type: "script",
        position: "head",
        content:
          "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${ID}');\nfbq('track', 'PageView');",
      },
      {
        name: "Meta Pixel — noscript",
        type: "raw",
        position: "head",
        content:
          "<noscript><img height=\"1\" width=\"1\" style=\"display:none\" src=\"https://www.facebook.com/tr?id=${ID}&ev=PageView&noscript=1\" /></noscript>",
      },
    ],
  },
  {
    id: "search_console",
    label: "Google Search Console",
    description: "Meta tag di verifica proprietà del sito",
    paramLabel: "Codice di verifica",
    paramPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    icon: "🔍",
    steps: [
      {
        name: "Search Console — verifica",
        type: "raw",
        position: "head",
        content: "<meta name=\"google-site-verification\" content=\"${ID}\" />",
      },
    ],
  },
  {
    id: "hotjar",
    label: "Hotjar",
    description: "Heatmap, registrazioni sessioni e sondaggi utente",
    paramLabel: "Site ID",
    paramPlaceholder: "1234567",
    icon: "🔥",
    steps: [
      {
        name: "Hotjar — tracking",
        type: "script",
        position: "head",
        content:
          "(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${ID},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Modale scelta modello
// ---------------------------------------------------------------------------
function PresetPicker({
  onPick,
  onCancel,
}: {
  onPick: (preset: Preset, paramValue: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Preset | null>(null);
  const [paramValue, setParamValue] = useState("");

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl w-full max-w-lg"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: "1px solid var(--admin-divider)" }}>
          <div className="flex items-center gap-2">
            <Wand2 size={15} style={{ color: "var(--admin-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
              {selected ? selected.label : "Scegli un modello"}
            </span>
          </div>
          <button type="button" onClick={selected ? () => { setSelected(null); setParamValue(""); } : onCancel}
            style={{ color: "var(--admin-text-faint)" }}>
            {selected ? <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> : <X size={16} />}
          </button>
        </div>

        {!selected ? (
          /* Lista preset */
          <div className="p-3 space-y-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span className="text-xl shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>{p.label}</div>
                  <div className="text-xs" style={{ color: "var(--admin-text-muted)" }}>{p.description}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
                    {p.steps.length === 1 ? "1 snippet" : `${p.steps.length} snippet`}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: "var(--admin-text-faint)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        ) : (
          /* Form parametro */
          <div className="p-5 space-y-4">
            <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              {selected.description}
            </p>

            {/* Anteprima snippet che verranno creati */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium" style={{ color: "var(--admin-text-muted)" }}>Verranno creati:</p>
              {selected.steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--admin-accent) 6%, var(--admin-card-bg))",
                    border: "1px solid color-mix(in srgb, var(--admin-accent) 15%, transparent)",
                  }}
                >
                  <span style={{ color: "var(--admin-accent)" }}>{TYPE_ICONS[step.type]}</span>
                  <span className="text-xs" style={{ color: "var(--admin-text)" }}>{step.name}</span>
                  <span className="text-xs ml-auto" style={{ color: "var(--admin-text-faint)" }}>
                    {POSITION_LABELS[step.position]}
                  </span>
                </div>
              ))}
            </div>

            {/* Input ID */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  marginBottom: "4px",
                  color: "var(--admin-text-muted)",
                }}
              >
                {selected.paramLabel}
              </label>
              <input
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                placeholder={selected.paramPlaceholder}
                autoFocus
                style={fieldStyle}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setSelected(null); setParamValue(""); }}
                className="px-4 py-2 text-sm rounded-lg"
                style={{
                  background: "var(--admin-input-bg)",
                  border: "1px solid var(--admin-border)",
                  color: "var(--admin-text-muted)",
                }}
              >
                Indietro
              </button>
              <button
                type="button"
                disabled={!paramValue.trim()}
                onClick={() => onPick(selected, paramValue.trim())}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{
                  background: "var(--admin-accent)",
                  opacity: paramValue.trim() ? 1 : 0.5,
                }}
              >
                <Save size={13} /> Aggiungi snippet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form modale (crea / modifica singolo snippet)
// ---------------------------------------------------------------------------
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

        {/* Tipo + Posizione */}
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
          <label style={labelStyle}>{isUrl ? "URL" : "Codice"}</label>
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
            className="px-4 py-2 text-sm rounded-lg"
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
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

// ---------------------------------------------------------------------------
// Riga snippet
// ---------------------------------------------------------------------------
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
    snippet.content.length > 60 ? snippet.content.slice(0, 60) + "…" : snippet.content;

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
      <GripVertical size={14} style={{ color: "var(--admin-text-faint)", flexShrink: 0, cursor: "grab" }} />
      <span style={{ color: "var(--admin-accent)", flexShrink: 0 }}>{TYPE_ICONS[t]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>{snippet.name}</span>
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
        <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--admin-text-faint)" }}>
          {previewContent}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggle(snippet.id, snippet.isActive)}
          disabled={isPending}
          title={snippet.isActive ? "Disattiva" : "Attiva"}
          style={{ color: snippet.isActive ? "var(--admin-accent)" : "var(--admin-text-faint)", padding: "4px", borderRadius: "6px", display: "flex" }}
        >
          {snippet.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>
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

// ---------------------------------------------------------------------------
// Tab principale
// ---------------------------------------------------------------------------
export function SnippetsTab({ initialSnippets }: { initialSnippets: SiteSnippet[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [snippets, setSnippets] = useOptimistic(initialSnippets);
  const [editTarget, setEditTarget] = useState<SiteSnippet | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function handleSave(data: Omit<SiteSnippet, "id" | "createdAt" | "updatedAt">) {
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

  async function handlePresetPick(preset: Preset, paramValue: string) {
    setShowPresets(false);
    setFormLoading(true);
    for (const step of preset.steps) {
      const content = step.content.replaceAll("${ID}", paramValue);
      await createSnippetAction({
        name: step.name,
        type: step.type,
        position: step.position,
        content,
        isActive: true,
        sortOrder: 0,
      });
    }
    setFormLoading(false);
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
    setSnippets((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !current } : s)));
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
            CSS, JavaScript e markup iniettati in tutte le pagine frontend.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Modelli predefiniti */}
          <button
            onClick={() => setShowPresets(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              background: "var(--admin-input-bg)",
              border: "1px solid var(--admin-border)",
              color: "var(--admin-text-muted)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--admin-input-bg)")}
          >
            <Wand2 size={13} /> Modelli
          </button>
          {/* Aggiungi manuale */}
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: "var(--admin-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            <Plus size={13} /> Aggiungi
          </button>
        </div>
      </div>

      {/* Lista */}
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
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--admin-text-faint)" }}>
            Usa i modelli predefiniti per Google Analytics, Meta Pixel e altri.
          </p>
          <button
            onClick={() => setShowPresets(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              background: "var(--admin-input-bg)",
              border: "1px solid var(--admin-border)",
              color: "var(--admin-text-muted)",
            }}
          >
            <Wand2 size={13} /> Scegli un modello
          </button>
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

      {/* Modale modelli */}
      {showPresets && (
        <PresetPicker
          onPick={handlePresetPick}
          onCancel={() => setShowPresets(false)}
        />
      )}

      {/* Form singolo snippet */}
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
