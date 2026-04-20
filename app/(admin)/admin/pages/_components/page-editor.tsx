"use client";

import type { Page, SeoPage, PageTemplate, TemplateField } from "@/lib/db/schema";
import { SeoForm } from "@/app/(admin)/admin/seo/_components/seo-form";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter, AlignLeft, AlignRight,
  Bold, Calendar, Code, Eye, EyeOff,
  Heading2, Heading3, Italic, Link2,
  List, ListOrdered, Minus, Pencil,
  RotateCcw, RotateCw, Search, UnderlineIcon,
  GitBranch, AlertTriangle, ShieldCheck, Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { upsertPageAction } from "../actions";
import PlaceholderHint from "./placeholder-hint";
import { EditorPageHeader } from "../../_components/editor-page-header";

type TemplateWithFields = PageTemplate & { fields: TemplateField[] };

const FORM_ID = "page-editor-form";

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}
function leafSlug(slug: string): string {
  const parts = slug.split("/");
  return parts[parts.length - 1] ?? slug;
}
function buildFullSlug(prefix: string, leaf: string): string {
  return prefix ? `${prefix}${leaf}` : leaf;
}

const inputStyle: React.CSSProperties = {
  background: "var(--admin-page-bg)", border: "1px solid var(--admin-input-border)",
  color: "var(--admin-text)", borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem", fontSize: "0.875rem", width: "100%", outline: "none",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "var(--admin-text-muted)", display: "block", marginBottom: "0.375rem",
};
const hintStyle: React.CSSProperties = { fontSize: "0.75rem", color: "var(--admin-text-faint)", marginTop: "0.25rem" };

function TBtn({ onClick, active, title, children, disabled }: {
  onClick: () => void; active?: boolean; title?: string; children: React.ReactNode; disabled?: boolean;
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
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors relative"
      style={{ color: active ? "var(--admin-accent)" : "var(--admin-text-muted)" }}
    >
      {children}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "var(--admin-accent)" }} />}
    </button>
  );
}

function CustomFieldsBlock({ template, customFields, setCustomFields }: {
  template: TemplateWithFields;
  customFields: Record<string, string>;
  setCustomFields: (v: Record<string, string>) => void;
}) {
  if (template.fields.length === 0) return null;
  function handleField(key: string, value: string) {
    setCustomFields({ ...customFields, [key]: value });
  }
  return (
    <div className="rounded-xl p-4 mb-5"
      style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--admin-text-faint)" }}>
        Campi custom — Template: {template.name}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...template.fields].sort((a, b) => a.sortOrder - b.sortOrder).map((field) => (
          <div key={field.id} className={field.fieldType === "textarea" || field.fieldType === "richtext" ? "sm:col-span-2" : ""}>
            <label style={labelStyle}>
              {field.label}
              {field.required && <span style={{ color: "#ef4444" }}> *</span>}
            </label>
            {field.fieldType === "textarea" || field.fieldType === "richtext" ? (
              <textarea value={customFields[field.fieldKey] ?? field.defaultValue ?? ""}
                onChange={(e) => handleField(field.fieldKey, e.target.value)}
                placeholder={field.placeholder ?? ""} rows={3}
                style={{ ...inputStyle, resize: "vertical" }} />
            ) : field.fieldType === "toggle" ? (
              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id={`cf-${field.fieldKey}`}
                  checked={(customFields[field.fieldKey] ?? field.defaultValue) === "true"}
                  onChange={(e) => handleField(field.fieldKey, e.target.checked ? "true" : "false")}
                  className="w-4 h-4 rounded" />
                <label htmlFor={`cf-${field.fieldKey}`} className="text-sm" style={{ color: "var(--admin-text)" }}>
                  {field.label}
                </label>
              </div>
            ) : (
              <input
                type={field.fieldType === "date" ? "date" : field.fieldType === "number" ? "number" : "text"}
                value={customFields[field.fieldKey] ?? field.defaultValue ?? ""}
                onChange={(e) => handleField(field.fieldKey, e.target.value)}
                placeholder={field.placeholder ?? ""} style={inputStyle} />
            )}
            {field.placeholder && field.fieldType !== "toggle" && (
              <p style={hintStyle}>{field.placeholder}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SeoTab({ seo, slug, domain, appName, pageTitle, onSeoSaved }: {
  seo?: SeoPage | null; slug: string; domain: string; appName: string; pageTitle: string;
  onSeoSaved?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const rows = seo ? [
    { label: "Meta Title", value: seo.title, hint: "Max 60 caratteri" },
    { label: "Meta Description", value: seo.description, hint: "Max 155 caratteri" },
    { label: "OG Title", value: seo.ogTitle },
    { label: "OG Description", value: seo.ogDescription },
    { label: "OG Image", value: seo.ogImage },
    { label: "Robots", value: seo.robots },
    { label: "JSON-LD", value: seo.jsonLdEnabled ? `Abilitato (${seo.jsonLdType ?? "WebPage"})` : "Disabilitato" },
  ] : [];
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--admin-text-faint)" }}>
          {seo ? "Meta SEO configurati" : "Nessun meta SEO"}
        </p>
        <button type="button" onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{
            background: seo ? "color-mix(in srgb, var(--admin-accent) 10%, var(--admin-card-bg))" : "var(--admin-accent)",
            color: seo ? "var(--admin-accent)" : "#fff",
            border: seo ? "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)" : "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}>
          {seo ? <Pencil size={12} /> : <Search size={12} />}
          {seo ? "Modifica SEO" : "Configura SEO"}
        </button>
      </div>
      {!seo ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <Search size={28} style={{ color: "var(--admin-text-faint)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>Nessun meta SEO configurato.</p>
            <p className="text-xs mt-1" style={{ color: "var(--admin-text-faint)" }}>Clicca <strong>Configura SEO</strong> per aggiungere titolo, descrizione e Open Graph.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg px-4 py-3"
              style={{ background: "var(--admin-page-bg)", border: "1px solid var(--admin-input-border)" }}>
              <p style={{ ...labelStyle, marginBottom: "0.25rem" }}>{row.label}</p>
              {row.value
                ? <p className="text-sm break-all" style={{ color: "var(--admin-text)" }}>{row.value}</p>
                : <p className="text-sm italic" style={{ color: "var(--admin-text-faint)" }}>Non impostato</p>}
              {row.hint && <p style={hintStyle}>{row.hint}</p>}
            </div>
          ))}
        </div>
      )}
      {showModal && createPortal(
        <SeoForm page={seo ?? null} domain={domain} appName={appName}
          unconfiguredRoutes={[]} lockedPathname={`/${slug}`}
          lockedLabel={pageTitle || slug} hidePathnameField={false}
          onClose={() => { setShowModal(false); onSeoSaved?.(); }} />,
        document.body,
      )}
    </>
  );
}

function PubTab({ status, setStatus, publishedAt, setPublishedAt, expiresAt, setExpiresAt, slug }: {
  status: "draft" | "published"; setStatus: (v: "draft" | "published") => void;
  publishedAt: string; setPublishedAt: (v: string) => void;
  expiresAt: string; setExpiresAt: (v: string) => void;
  slug: string;
}) {
  const previewUrl = `/admin/preview/${slug}`;
  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--admin-card-border)" }}>
        <button type="button" onClick={() => setStatus("draft")}
          className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
          style={{
            background: status === "draft"
              ? "color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg))"
              : "var(--admin-card-bg)",
            borderBottom: "1px solid var(--admin-card-border)",
          }}>
          <EyeOff size={16} style={{ color: status === "draft" ? "var(--admin-accent)" : "var(--admin-text-faint)", flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: status === "draft" ? "var(--admin-accent)" : "var(--admin-text)" }}>Draft</p>
            <p className="text-xs" style={{ color: "var(--admin-text-faint)" }}>Visible only in admin preview</p>
          </div>
          {status === "draft" && <ShieldCheck size={14} style={{ color: "var(--admin-accent)", marginLeft: "auto" }} />}
        </button>
        <button type="button" onClick={() => setStatus("published")}
          className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
          style={{
            background: status === "published"
              ? "color-mix(in srgb, #22c55e 8%, var(--admin-card-bg))"
              : "var(--admin-card-bg)",
          }}>
          <Eye size={16} style={{ color: status === "published" ? "#22c55e" : "var(--admin-text-faint)", flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: status === "published" ? "#22c55e" : "var(--admin-text)" }}>Published</p>
            <p className="text-xs" style={{ color: "var(--admin-text-faint)" }}>Publicly visible on the website</p>
          </div>
          {status === "published" && <ShieldCheck size={14} style={{ color: "#22c55e", marginLeft: "auto" }} />}
        </button>
      </div>
      <div>
        <label style={labelStyle}><Calendar size={11} className="inline mr-1" />Publish date</label>
        <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} style={inputStyle} />
        <p style={hintStyle}>Leave empty to publish immediately when status is "Published".</p>
      </div>
      <div>
        <label style={labelStyle}><Calendar size={11} className="inline mr-1" />Expiry date</label>
        <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={inputStyle} />
        <p style={hintStyle}>Optional. After this date the page reverts to draft.</p>
      </div>
      <a href={previewUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium rounded-lg transition-colors"
        style={{ background: "var(--admin-page-bg)", border: "1px solid var(--admin-input-border)", color: "var(--admin-text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--admin-input-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--admin-input-border)")}>
        <Eye size={14} /> Preview
      </a>
    </div>
  );
}

export default function PageEditor({
  page,
  isEdit,
  templates,
  seo,
  domain,
  appName,
  parentSlugPrefix,
}: {
  page?: Page | null;
  isEdit?: boolean;
  templates: TemplateWithFields[];
  seo?: SeoPage | null;
  domain: string;
  appName: string;
  parentSlugPrefix?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "pub">("content");

  const selectedTemplate = templates.find((t) => t.id === page?.templateId) ?? templates[0];
  const isTemplateLocked = !!(page?.id) || false;
  const [templateId, setTemplateId] = useState<number | undefined>(selectedTemplate?.id);
  const currentTemplate = templates.find((t) => t.id === templateId) ?? selectedTemplate;

  const [title, setTitle] = useState(page?.title ?? "");
  const [leafSlugVal, setLeafSlugVal] = useState(() => {
    const full = page?.slug ?? "";
    const prefix = parentSlugPrefix ?? "";
    if (prefix && full.startsWith(prefix)) return full.slice(prefix.length);
    return leafSlug(full);
  });
  const [slugManual, setSlugManual] = useState(!!page?.slug);
  const [content, setContent] = useState(page?.content ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (page?.status as "draft" | "published") ?? "draft",
  );
  const [publishedAt, setPublishedAt] = useState(
    page?.publishedAt ? toDatetimeLocal(page.publishedAt) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    page?.expiresAt ? toDatetimeLocal(page.expiresAt) : "",
  );

  const [customFields, setCustomFields] = useState<Record<string, string>>(() => {
    try { return JSON.parse(page?.customFields ?? "{}"); } catch { return {}; }
  });

  const [seoCurrent, setSeoCurrent] = useState(seo);
  const prevTemplate = useRef(currentTemplate);

  useEffect(() => {
    if (!slugManual && title) {
      setLeafSlugVal(slugify(title));
    }
  }, [title, slugManual]);

  useEffect(() => {
    if (prevTemplate.current?.id !== currentTemplate?.id) {
      prevTemplate.current = currentTemplate;
    }
  }, [currentTemplate]);

  const fullSlug = buildFullSlug(parentSlugPrefix ?? "", leafSlugVal);

  const [state, formAction, isPending] = useActionState(upsertPageAction, null);

  useEffect(() => {
    if (!state?.savedAt) return;
    if (!isEdit && state.createdId) {
      router.replace(`/admin/pages/${state.createdId}/edit`);
      return;
    }
    router.refresh();
  }, [state?.savedAt]);

  function handleInsertToken(token: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(token).run();
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[220px] px-4 py-3",
        style: "color: var(--admin-text); font-size: 0.9rem;",
      },
    },
  });

  function handleLinkToggle() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    if (prev) { editor.chain().focus().unsetLink().run(); return; }
    const url = window.prompt("URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }

  const breadcrumbs = isEdit
    ? [
        { label: "Contenuti", href: "/admin/pages" },
        { label: page?.title ?? "Edit page", href: "#" },
      ]
    : [
        { label: "Contenuti", href: "/admin/pages" },
        { label: "New page" },
      ];

  return (
    <>
      <EditorPageHeader
        breadcrumbs={breadcrumbs}
        backHref="/admin/pages"
        formId={FORM_ID}
        isPending={isPending}
        savedAt={state?.savedAt}
        saveError={state?.error}
        saveLabel={isEdit ? "Save changes" : "Create page"}
      />

      <form id={FORM_ID} action={formAction} className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
        {page?.id && <input type="hidden" name="id" value={page.id} />}
        {page?.parentId && <input type="hidden" name="parentId" value={page.parentId} />}
        <input type="hidden" name="content" value={content} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="customFields" value={JSON.stringify(customFields)} />

        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {!isTemplateLocked && templates.length > 1 && (
            <div className="rounded-xl p-4"
              style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
              <label style={labelStyle}>Template</label>
              <select name="templateId" value={templateId ?? ""}
                onChange={(e) => setTemplateId(Number(e.target.value))}
                style={inputStyle}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {isTemplateLocked && page?.templateId && (
            <input type="hidden" name="templateId" value={page.templateId} />
          )}
          {!isTemplateLocked && templates.length === 1 && (
            <input type="hidden" name="templateId" value={templates[0].id} />
          )}

          {currentTemplate && (
            <CustomFieldsBlock template={currentTemplate} customFields={customFields} setCustomFields={setCustomFields} />
          )}

          <div className="rounded-xl overflow-hidden"
            style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
            <div className="flex items-center border-b" style={{ borderColor: "var(--admin-divider)" }}>
              <TabBtn active={activeTab === "content"} onClick={() => setActiveTab("content")}>
                <Pencil size={13} /> Content
              </TabBtn>
              <TabBtn active={activeTab === "seo"} onClick={() => setActiveTab("seo")}>
                <Search size={13} /> SEO
              </TabBtn>
              <TabBtn active={activeTab === "pub"} onClick={() => setActiveTab("pub")}>
                <Eye size={13} /> Publish
              </TabBtn>
            </div>

            {activeTab === "content" && (
              <div className="p-5 space-y-4">
                <PlaceholderHint onInsert={handleInsertToken} />
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input name="title" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="Page title" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Slug *</label>
                  <div className="flex items-center gap-2">
                    {parentSlugPrefix && (
                      <span className="text-sm shrink-0" style={{ color: "var(--admin-text-faint)" }}>
                        /{parentSlugPrefix}
                      </span>
                    )}
                    <input name="slug" value={fullSlug} readOnly type="hidden" />
                    <input value={leafSlugVal}
                      onChange={(e) => { setLeafSlugVal(e.target.value); setSlugManual(true); }}
                      placeholder="page-slug" required style={inputStyle} />
                    {slugManual && (
                      <button type="button" onClick={() => { setSlugManual(false); setLeafSlugVal(slugify(title)); }}
                        className="shrink-0 p-2 rounded-lg transition-colors"
                        style={{ background: "var(--admin-page-bg)", border: "1px solid var(--admin-input-border)", color: "var(--admin-text-muted)" }}
                        title="Reset slug from title">
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                  <p style={hintStyle}>
                    Full URL: <code style={{ fontSize: "0.7rem" }}>/{fullSlug}</code>
                    {slugManual && (
                      <span className="ml-2" style={{ color: "var(--admin-text-faint)" }}>
                        <Lock size={10} className="inline" /> manual
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Body content</label>
                  {editor && (
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--admin-input-border)" }}>
                      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b" style={{ borderColor: "var(--admin-divider)", background: "var(--admin-page-bg)" }}>
                        <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code"><Code size={13} /></TBtn>
                        <TDivider />
                        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 size={13} /></TBtn>
                        <TDivider />
                        <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"><ListOrdered size={13} /></TBtn>
                        <TDivider />
                        <TBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left"><AlignLeft size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center"><AlignCenter size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right"><AlignRight size={13} /></TBtn>
                        <TDivider />
                        <TBtn onClick={handleLinkToggle} active={editor.isActive("link")} title="Link"><Link2 size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={13} /></TBtn>
                        <TDivider />
                        <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><RotateCcw size={13} /></TBtn>
                        <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><RotateCw size={13} /></TBtn>
                      </div>
                      <div style={{ background: "var(--admin-page-bg)" }}>
                        <EditorContent editor={editor} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "seo" && (
              <div className="p-5">
                <SeoTab seo={seoCurrent} slug={fullSlug} domain={domain} appName={appName}
                  pageTitle={title} onSeoSaved={() => { setSeoCurrent(undefined); setActiveTab("content"); }} />
              </div>
            )}

            {activeTab === "pub" && (
              <div className="p-5">
                <PubTab status={status} setStatus={setStatus}
                  publishedAt={publishedAt} setPublishedAt={setPublishedAt}
                  expiresAt={expiresAt} setExpiresAt={setExpiresAt} slug={slug} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-4"
            style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
            <div>
              <label style={labelStyle}>Status</label>
              <div className="flex gap-2">
                {(["draft", "published"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize"
                    style={{
                      background: status === s
                        ? s === "published"
                          ? "color-mix(in srgb, #22c55e 15%, var(--admin-card-bg))"
                          : "color-mix(in srgb, var(--admin-accent) 15%, var(--admin-card-bg))"
                        : "var(--admin-page-bg)",
                      color: status === s
                        ? s === "published" ? "#22c55e" : "var(--admin-accent)"
                        : "var(--admin-text-muted)",
                      border: status === s
                        ? s === "published"
                          ? "1px solid color-mix(in srgb, #22c55e 30%, transparent)"
                          : "1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)"
                        : "1px solid var(--admin-input-border)",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {page?.parentId && (
              <div>
                <label style={labelStyle}><GitBranch size={11} className="inline mr-1" />Parent page</label>
                <p className="text-xs font-mono" style={{ color: "var(--admin-text-faint)" }}>
                  ID {page.parentId}
                </p>
              </div>
            )}

            {currentTemplate && (
              <div>
                <label style={labelStyle}>Template</label>
                <div className="flex items-center gap-2">
                  {isTemplateLocked && <Lock size={10} style={{ color: "var(--admin-text-faint)", flexShrink: 0 }} />}
                  <p className="text-xs font-mono" style={{ color: "var(--admin-text-faint)" }}>
                    {currentTemplate.name}
                  </p>
                </div>
              </div>
            )}

            {state?.error && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                style={{ background: "color-mix(in srgb,#ef4444 10%,var(--admin-card-bg))", color: "#f87171", border: "1px solid color-mix(in srgb,#ef4444 25%,transparent)" }}>
                <AlertTriangle size={13} />
                {state.error}
              </div>
            )}
          </div>
        </div>
      </form>
    </>
  );
}

function toDatetimeLocal(date: Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
