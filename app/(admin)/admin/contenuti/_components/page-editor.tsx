"use client";

import type { Page } from "@/lib/db/schema";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  ArrowLeft,
  Bold,
  Italic,
  UnderlineIcon,
  Link2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading2,
  Heading3,
  Minus,
  Eye,
  EyeOff,
  Info,
  RotateCcw,
  RotateCw,
  Code,
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

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="p-1.5 rounded transition-colors disabled:opacity-30"
      style={{
        color: active ? "var(--admin-accent)" : "var(--admin-text-muted)",
        background: active
          ? "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))"
          : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active)
          e.currentTarget.style.background = "var(--admin-hover-bg)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      className="w-px h-5 mx-0.5 shrink-0"
      style={{ background: "var(--admin-divider)" }}
    />
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
export default function PageEditor({ page }: { page?: Page | null }) {
  const router = useRouter();
  const isEdit = !!page;

  const [state, action, isPending] = useActionState(upsertPageAction, {});
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugManual, setSlugManual] = useState(isEdit);
  const [status, setStatus] = useState<"draft" | "published">(
    (page?.status as "draft" | "published") ?? "draft",
  );

  // Hidden input ref for content
  const contentRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline text-blue-600" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: page?.content ?? "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
    onUpdate({ editor }) {
      if (contentRef.current) {
        contentRef.current.value = editor.getHTML();
      }
    },
  });

  // Sync content hidden input on first render
  useEffect(() => {
    if (editor && contentRef.current) {
      contentRef.current.value = editor.getHTML();
    }
  }, [editor]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) setSlug(slugify(val));
  }

  function handleLinkInsert() {
    const url = window.prompt("URL del link:");
    if (!url) return;
    if (url === "") {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }

  return (
    <>
      {/* TipTap editor styles */}
      <style>{`
        .tiptap-editor {
          min-height: 420px;
          padding: 1rem 1.25rem;
          outline: none;
          font-size: 0.9375rem;
          line-height: 1.75;
          color: var(--admin-text);
        }
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
        .tiptap-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--admin-text-faint);
          float: left;
          pointer-events: none;
          height: 0;
        }
      `}</style>

      <form action={action} className="space-y-6">
        {isEdit && <input type="hidden" name="originalSlug" value={page!.slug} />}
        {/* Content hidden input — aggiornato da TipTap */}
        <input type="hidden" name="content" ref={contentRef} />
        <input type="hidden" name="status" value={status} />

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push("/admin/contenuti")}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "var(--admin-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted)")}
          >
            <ArrowLeft size={15} />
            Contenuti
          </button>

          <div className="flex items-center gap-2">
            {/* Toggle stato */}
            <button
              type="button"
              onClick={() => setStatus((v) => (v === "published" ? "draft" : "published"))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background:
                  status === "published"
                    ? "color-mix(in srgb, #22c55e 15%, var(--admin-card-bg))"
                    : "color-mix(in srgb, var(--admin-text-faint) 12%, var(--admin-card-bg))",
                color: status === "published" ? "#22c55e" : "var(--admin-text-muted)",
                border:
                  status === "published"
                    ? "1px solid color-mix(in srgb, #22c55e 30%, transparent)"
                    : "1px solid var(--admin-card-border)",
              }}
            >
              {status === "published" ? (
                <><Eye size={14} /> Pubblicata</>
              ) : (
                <><EyeOff size={14} /> Bozza</>
              )}
            </button>

            {/* Salva */}
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-60"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              {isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {isEdit ? "Salva modifiche" : "Crea pagina"}
            </button>
          </div>
        </div>

        {/* Titolo + Slug */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Titolo pagina</label>
              <input
                name="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Es. Chi siamo"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ ...labelStyle, marginBottom: 0 }}>Slug (URL)</label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setSlugManual((v) => !v)}
                    className="text-xs"
                    style={{ color: "var(--admin-accent)" }}
                  >
                    {slugManual ? "Auto" : "Modifica"}
                  </button>
                )}
              </div>
              <div className="flex">
                <span
                  className="px-3 py-2 text-sm rounded-l-lg shrink-0"
                  style={{
                    background: "var(--admin-hover-bg)",
                    border: "1px solid var(--admin-input-border)",
                    borderRight: "none",
                    color: "var(--admin-text-faint)",
                    fontSize: "0.875rem",
                  }}
                >
                  /
                </span>
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                  readOnly={isEdit}
                  placeholder="chi-siamo"
                  style={{
                    ...inputStyle,
                    borderRadius: "0 0.5rem 0.5rem 0",
                    fontFamily: "monospace",
                    background: isEdit ? "var(--admin-hover-bg)" : inputStyle.background,
                    color: isEdit ? "var(--admin-text-muted)" : inputStyle.color,
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--admin-text-faint)" }}>
                {isEdit
                  ? "Lo slug non può essere modificato dopo la creazione."
                  : <>URL: <strong style={{ color: "var(--admin-text-muted)" }}>/{slug || "slug-pagina"}</strong></>}
              </p>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}
        >
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center gap-0.5 px-3 py-2"
            style={{
              borderBottom: "1px solid var(--admin-divider)",
              background: "var(--admin-page-bg)",
            }}
          >
            {/* Undo / Redo */}
            <TBtn onClick={() => editor?.chain().focus().undo().run()} title="Annulla" disabled={!editor?.can().undo()}>
              <RotateCcw size={15} />
            </TBtn>
            <TBtn onClick={() => editor?.chain().focus().redo().run()} title="Ripeti" disabled={!editor?.can().redo()}>
              <RotateCw size={15} />
            </TBtn>
            <Divider />

            {/* Headings */}
            <TBtn
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive("heading", { level: 2 })}
              title="Titolo H2"
            >
              <Heading2 size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive("heading", { level: 3 })}
              title="Sottotitolo H3"
            >
              <Heading3 size={15} />
            </TBtn>
            <Divider />

            {/* Format */}
            <TBtn
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Grassetto"
            >
              <Bold size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Corsivo"
            >
              <Italic size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={editor?.isActive("underline")}
              title="Sottolineato"
            >
              <UnderlineIcon size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={editor?.isActive("code")}
              title="Codice inline"
            >
              <Code size={15} />
            </TBtn>
            <Divider />

            {/* Lists */}
            <TBtn
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Lista puntata"
            >
              <List size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              title="Lista numerata"
            >
              <ListOrdered size={15} />
            </TBtn>
            <Divider />

            {/* Align */}
            <TBtn
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              active={editor?.isActive({ textAlign: "left" })}
              title="Allinea a sinistra"
            >
              <AlignLeft size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              active={editor?.isActive({ textAlign: "center" })}
              title="Centra"
            >
              <AlignCenter size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              active={editor?.isActive({ textAlign: "right" })}
              title="Allinea a destra"
            >
              <AlignRight size={15} />
            </TBtn>
            <Divider />

            {/* Link + HR */}
            <TBtn
              onClick={handleLinkInsert}
              active={editor?.isActive("link")}
              title="Inserisci link"
            >
              <Link2 size={15} />
            </TBtn>
            <TBtn
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="Linea orizzontale"
            >
              <Minus size={15} />
            </TBtn>
          </div>

          {/* Editor area */}
          <EditorContent editor={editor} />
        </div>

        {/* SEO hint */}
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
          }}
        >
          <Info size={13} className="mt-0.5 shrink-0" style={{ color: "var(--admin-accent)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
            I meta SEO (title, description, OG…) si configurano in{" "}
            <strong>SEO → Meta Tags</strong>. La pagina comparirà automaticamente
            nella lista percorsi una volta pubblicata.
          </p>
        </div>

        {/* Error */}
        {state?.error && (
          <p
            className="text-sm rounded-lg px-3 py-2"
            style={{
              color: "#ef4444",
              background: "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))",
              border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)",
            }}
          >
            {state.error}
          </p>
        )}
      </form>
    </>
  );
}
