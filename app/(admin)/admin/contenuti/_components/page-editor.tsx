"use client";

import type { Page, SeoPage } from "@/lib/db/schema";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Calendar,
  Check,
  Code,
  Eye,
  EyeOff,
  Heading2,
  Heading3,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  RotateCcw,
  RotateCw,
  Search,
  UnderlineIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { upsertPageAction } from "../actions";

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

const inputStyle: React.CSSProperties = {
  background: "var(--admin-page-bg)",
  border: "1px solid var(--admin-input-border)",
  color: "var(--admin-text)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--admin-text-muted)",
  display: "block",
  marginBottom: "0.375rem",
};

const hintStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--admin-text-faint)",
  marginTop: "0.25rem",
};

// ─── Toolbar button
function TBtn({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void; active?: boolean; title?: string;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className="p-1.5 rounded transition-colors disabled:opacity-30"
      style={{
        color: active ? "var(--admin-accent)" : "var(--admin-text-muted)",
        background: active ? "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))" : "transparent",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--admin-hover-bg)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >{children}</button>
  );
}

function TDivider() {
  return <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: "var(--admin-divider)" }} />;
}

// ─── Tab button
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative"
      style={{ color: active ? "var(--admin-accent)" : "var(--admin-text-muted)" }}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ background: "var(--admin-accent)" }} />
      )}
    </button>
  );
}

// ─── SEO Tab (read-only)
function SeoTab({ seo, slug }: { seo?: SeoPage | null; slug: string }) {
  if (!seo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Search size={32} style={{ color: "var(--admin-text-faint)" }} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>
            Nessun meta SEO configurato per questa pagina
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--admin-text-faint)" }}>
            Vai in <strong>SEO → Meta Tags</strong> e cerca <code>/{slug}</code> per configurarli.
          </p>
        </div>
      </div>
    );
  }

  const rows: { label: string; value?: string | null; hint?: string }[] = [
    { label: "Meta Title", value: seo.title, hint: "Max 70 caratteri" },
    { label: "Meta Description", value: seo.description, hint: "Max 160 caratteri" },
    { label: "OG Title", value: seo.ogTitle },
    { label: "OG Description", value: seo.ogDescription },
    { label: "OG Image", value: seo.ogImage },
    { label: "Robots", value: seo.robots },
    { label: "JSON-LD", value: seo.jsonLdEnabled ? `Abilitato (${seo.jsonLdType ?? "WebPage"})` : "Disabilitato" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-2"
        style={{
          background: "color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg))",
          border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
        }}
      >
        <Info size={13} className="mt-0.5 shrink-0" style={{ color: "var(--admin-accent)" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
          Questi dati sono in sola lettura. Per modificarli vai in{" "}
          <strong>SEO → Meta Tags → /{slug}</strong>.
        </p>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg px-4 py-3"
          style={{ background: "var(--admin-page-bg)", border: "1px solid var(--admin-input-border)" }}
        >
          <p style={{ ...labelStyle, marginBottom: "0.25rem" }}>{row.label}</p>
          {row.value ? (
            <p className="text-sm break-all" style={{ color: "var(--admin-text)" }}>{row.value}</p>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--admin-text-faint)" }}>Non impostato</p>
          )}
          {row.hint && <p style={hintStyle}>{row.hint}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Pubblicazione Tab
function PubTab({
  status, setStatus,
  publishedAt, setPublishedAt,
  expiresAt, setExpiresAt,
  slug,
}: {
  status: "draft" | "published";
  setStatus: (v: "draft" | "published") => void;
  publishedAt: string;
  setPublishedAt: (v: string) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
  slug: string;
}) {
  return (
    <div className="space-y-5">
      {/* Stato */}
      <div className="rounded-xl px-4 py-4 space-y-3"
        style={{ background: "var(--admin-page-bg)", border: "1px solid var(--admin-input-border)" }}
      >
        <p style={labelStyle}>Stato pubblicazione</p>
        <div className="flex gap-3">
          {(["draft", "published"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: status === s
                  ? s === "published"
                    ? "color-mix(in srgb, #22c55e 15%, var(--admin-card-bg))"
                    : "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))"
                  : "var(--admin-card-bg)",
                color: status === s
                  ? s === "published" ? "#22c55e" : "var(--admin-accent)"
                  : "var(--admin-text-muted)",
                border: status === s
                  ? s === "published"
                    ? "1px solid color-mix(in srgb, #22c55e 30%, transparent)"
                    : "1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)"
                  : "1px solid var(--admin-card-border)",
              }}
            >
              {s === "published" ? <Eye size={15} /> : <EyeOff size={15} />}
              {s === "published" ? "Pubblicata" : "Bozza"}
            </button>
          ))}
        </div>
        <p style={hintStyle}>
          {status === "published"
            ? `La pagina è visibile pubblicamente su /${slug}`
            : "La pagina non è visibile al pubblico"}
        </p>
      </div>

      {/* Data pubblicazione */}
      <div className="space-y-1.5">
        <label style={labelStyle}>Data di pubblicazione</label>
        <input
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          style={inputStyle}
        />
        <p style={hintStyle}>
          Se vuota e lo stato è "Pubblicata", verrà usata la data e ora attuale.
        </p>
      </div>

      {/* Data scadenza */}
      <div className="space-y-1.5">
        <label style={labelStyle}>Data di scadenza (opzionale)</label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          style={inputStyle}
        />
        <p style={hintStyle}>
          Dopo questa data la pagina tornerà automaticamente in bozza.
          Lascia vuoto per nessuna scadenza.
        </p>
      </div>

      {expiresAt && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, #f59e0b 8%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, #f59e0b 25%, transparent)",
          }}
        >
          <Calendar size={13} className="mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
            Contenuto temporaneo: scade il{" "}
            <strong>{new Date(expiresAt).toLocaleString("it-IT")}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Editor
export default function PageEditor({
  page,
  seo,
}: {
  page?: Page | null;
  seo?: SeoPage | null;
}) {
  const router = useRouter();
  const isEdit = !!page;
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "pub">("content");

  const [state, action, isPending] = useActionState(upsertPageAction, {});
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugManual, setSlugManual] = useState(isEdit);
  const [status, setStatus] = useState<"draft" | "published">(
    (page?.status as "draft" | "published") ?? "draft",
  );
  const [publishedAt, setPublishedAt] = useState(
    page?.publishedAt ? toDatetimeLocal(page.publishedAt) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    page?.expiresAt ? toDatetimeLocal(page.expiresAt) : "",
  );

  // Toast
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    if (state?.savedAt) {
      setSavedAt(new Date(state.savedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
      const t = setTimeout(() => setSavedAt(null), 4000);
      return () => clearTimeout(t);
    }
  }, [state?.savedAt]);

  const contentRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: page?.content ?? "",
    editorProps: { attributes: { class: "tiptap-editor" } },
    onUpdate({ editor }) {
      if (contentRef.current) contentRef.current.value = editor.getHTML();
    },
  });

  useEffect(() => {
    if (editor && contentRef.current) contentRef.current.value = editor.getHTML();
  }, [editor]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) setSlug(slugify(val));
  }

  function handleLinkInsert() {
    const url = window.prompt("URL del link:");
    if (url === null) return;
    if (url === "") editor?.chain().focus().unsetLink().run();
    else editor?.chain().focus().setLink({ href: url }).run();
  }

  return (
    <>
      <style>{`
        .tiptap-editor { min-height: 440px; padding: 1rem 1.25rem; outline: none; font-size: 0.9375rem; line-height: 1.75; color: var(--admin-text); }
        .tiptap-editor h2 { font-size: 1.375rem; font-weight: 700; margin: 1.25em 0 0.5em; }
        .tiptap-editor h3 { font-size: 1.125rem; font-weight: 600; margin: 1em 0 0.4em; }
        .tiptap-editor h4 { font-size: 1rem; font-weight: 600; margin: 0.8em 0 0.3em; }
        .tiptap-editor p { margin: 0 0 0.75em; }
        .tiptap-editor p:last-child { margin-bottom: 0; }
        .tiptap-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5em 0; }
        .tiptap-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5em 0; }
        .tiptap-editor li { margin: 0.2em 0; }
        .tiptap-editor a { color: var(--admin-accent); text-decoration: underline; }
        .tiptap-editor hr { border: none; border-top: 1px solid var(--admin-divider); margin: 1.5em 0; }
        .tiptap-editor code { font-family: monospace; font-size: 0.875em; background: var(--admin-hover-bg); padding: 0.1em 0.35em; border-radius: 0.25rem; }
        .tiptap-editor pre { background: var(--admin-hover-bg); padding: 1em; border-radius: 0.5rem; overflow-x: auto; margin: 0.75em 0; }
        .tiptap-editor pre code { background: none; padding: 0; }
        .tiptap-editor blockquote { border-left: 3px solid var(--admin-accent); padding-left: 1rem; color: var(--admin-text-muted); margin: 0.75em 0; }
        .tiptap-editor strong { font-weight: 700; }
        .tiptap-editor em { font-style: italic; }
        .tiptap-editor .ProseMirror-focused { outline: none; }
      `}</style>

      <form action={action} className="space-y-0">
        {isEdit && <input type="hidden" name="originalSlug" value={page!.slug} />}
        <input type="hidden" name="content" ref={contentRef} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="publishedAt" value={publishedAt} />
        <input type="hidden" name="expiresAt" value={expiresAt} />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <button type="button" onClick={() => router.push("/admin/contenuti")}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "var(--admin-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted)")}
          >
            <ArrowLeft size={15} />
            Contenuti
          </button>

          <div className="flex items-center gap-2">
            {/* Toast salvataggio */}
            {savedAt && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                style={{
                  color: "#22c55e",
                  background: "color-mix(in srgb, #22c55e 12%, var(--admin-card-bg))",
                  border: "1px solid color-mix(in srgb, #22c55e 25%, transparent)",
                }}
              >
                <Check size={12} /> Salvato alle {savedAt}
              </span>
            )}
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-60"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              {isPending && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isEdit ? "Salva modifiche" : "Crea pagina"}
            </button>
          </div>
        </div>

        {/* Titolo + Slug */}
        <div className="rounded-xl p-5 mb-5 space-y-4"
          style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Titolo pagina</label>
              <input name="title" value={title} onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Es. Chi siamo" required style={inputStyle} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ ...labelStyle, marginBottom: 0 }}>Slug (URL)</label>
                {!isEdit && (
                  <button type="button" onClick={() => setSlugManual((v) => !v)}
                    className="text-xs" style={{ color: "var(--admin-accent)" }}
                  >
                    {slugManual ? "Auto" : "Modifica"}
                  </button>
                )}
              </div>
              <div className="flex">
                <span className="px-3 py-2 text-sm rounded-l-lg shrink-0"
                  style={{ background: "var(--admin-hover-bg)", border: "1px solid var(--admin-input-border)", borderRight: "none", color: "var(--admin-text-faint)", fontSize: "0.875rem" }}
                >/</span>
                <input name="slug" value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                  readOnly={isEdit} placeholder="chi-siamo"
                  style={{ ...inputStyle, borderRadius: "0 0.5rem 0.5rem 0", fontFamily: "monospace",
                    background: isEdit ? "var(--admin-hover-bg)" : inputStyle.background,
                    color: isEdit ? "var(--admin-text-muted)" : inputStyle.color,
                  }}
                />
              </div>
              <p style={hintStyle}>
                {isEdit ? "Lo slug non può essere modificato dopo la creazione."
                  : <>URL: <strong style={{ color: "var(--admin-text-muted)" }}>/{slug || "slug-pagina"}</strong></>}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
        >
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: "1px solid var(--admin-divider)" }}>
            <TabBtn active={activeTab === "content"} onClick={() => setActiveTab("content")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Contenuto
            </TabBtn>
            <TabBtn active={activeTab === "seo"} onClick={() => setActiveTab("seo")}>
              <Search size={14} />
              SEO
              {!seo && (
                <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: "#f59e0b" }} />
              )}
            </TabBtn>
            <TabBtn active={activeTab === "pub"} onClick={() => setActiveTab("pub")}>
              <Calendar size={14} />
              Pubblicazione
            </TabBtn>
          </div>

          {/* Tab: Contenuto */}
          {activeTab === "content" && (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 px-3 py-2"
                style={{ borderBottom: "1px solid var(--admin-divider)", background: "var(--admin-page-bg)" }}
              >
                <TBtn onClick={() => editor?.chain().focus().undo().run()} title="Annulla" disabled={!editor?.can().undo()}><RotateCcw size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().redo().run()} title="Ripeti" disabled={!editor?.can().redo()}><RotateCw size={15} /></TBtn>
                <TDivider />
                <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="H2"><Heading2 size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="H3"><Heading3 size={15} /></TBtn>
                <TDivider />
                <TBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Grassetto"><Bold size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Corsivo"><Italic size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Sottolineato"><UnderlineIcon size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive("code")} title="Codice"><Code size={15} /></TBtn>
                <TDivider />
                <TBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Lista puntata"><List size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Lista numerata"><ListOrdered size={15} /></TBtn>
                <TDivider />
                <TBtn onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Sinistra"><AlignLeft size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Centra"><AlignCenter size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Destra"><AlignRight size={15} /></TBtn>
                <TDivider />
                <TBtn onClick={handleLinkInsert} active={editor?.isActive("link")} title="Link"><Link2 size={15} /></TBtn>
                <TBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Separatore"><Minus size={15} /></TBtn>
              </div>
              <EditorContent editor={editor} />
            </>
          )}

          {/* Tab: SEO */}
          {activeTab === "seo" && (
            <div className="p-5">
              <SeoTab seo={seo} slug={slug} />
            </div>
          )}

          {/* Tab: Pubblicazione */}
          {activeTab === "pub" && (
            <div className="p-5">
              <PubTab
                status={status} setStatus={setStatus}
                publishedAt={publishedAt} setPublishedAt={setPublishedAt}
                expiresAt={expiresAt} setExpiresAt={setExpiresAt}
                slug={slug}
              />
            </div>
          )}
        </div>

        {/* Error */}
        {state?.error && (
          <p className="text-sm rounded-lg px-3 py-2 mt-4"
            style={{ color: "#ef4444", background: "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))", border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)" }}
          >
            {state.error}
          </p>
        )}
      </form>
    </>
  );
}

function toDatetimeLocal(date: Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
