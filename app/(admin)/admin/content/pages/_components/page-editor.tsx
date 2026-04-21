"use client";

import { SeoForm } from "@/app/(admin)/admin/seo/_components/seo-form";
import type {
  Page,
  PageTemplate,
  SeoPage,
  TemplateField,
} from "@/lib/db/schema";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Calendar,
  Code,
  Eye,
  EyeOff,
  GitBranch,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  Minus,
  Pencil,
  RotateCcw,
  RotateCw,
  Search,
  ShieldCheck,
  UnderlineIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorPageHeader } from "../../../_components/editor-page-header";
import { upsertPageAction } from "../actions";
import PlaceholderHint from "./placeholder-hint";

type TemplateWithFields = PageTemplate & { fields: TemplateField[] };

const FORM_ID = "page-editor-form";

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
function leafSlug(slug: string): string {
  const parts = slug.split("/");
  return parts[parts.length - 1] ?? slug;
}
function buildFullSlug(prefix: string, leaf: string): string {
  return prefix ? `${prefix}${leaf}` : leaf;
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
        if (!active) e.currentTarget.style.background = "var(--admin-hover-bg)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}>
      {children}
    </button>
  );
}
function TDivider() {
  return (
    <div
      className="w-px h-5 mx-0.5 shrink-0"
      style={{ background: "var(--admin-divider)" }}
    />
  );
}
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors relative"
      style={{
        color: active ? "var(--admin-accent)" : "var(--admin-text-muted)",
      }}>
      {children}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ background: "var(--admin-accent)" }}
        />
      )}
    </button>
  );
}

function CustomFieldsBlock({
  template,
  customFields,
  setCustomFields,
}: {
  template: TemplateWithFields;
  customFields: Record<string, string>;
  setCustomFields: (v: Record<string, string>) => void;
}) {
  if (template.fields.length === 0) return null;
  function handleField(key: string, value: string) {
    setCustomFields({ ...customFields, [key]: value });
  }
  return (
    <div
      className="rounded-xl p-4 mb-5"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
      }}>
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-4"
        style={{ color: "var(--admin-text-faint)" }}>
        Campi custom — Template: {template.name}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...template.fields]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((field) => (
            <div
              key={field.id}
              className={
                field.fieldType === "textarea" || field.fieldType === "richtext"
                  ? "sm:col-span-2"
                  : ""
              }>
              <label style={labelStyle}>
                {field.label}
                {field.required && <span style={{ color: "#ef4444" }}> *</span>}
              </label>
              {field.fieldType === "textarea" ||
              field.fieldType === "richtext" ? (
                <textarea
                  value={
                    customFields[field.fieldKey] ?? field.defaultValue ?? ""
                  }
                  onChange={(e) => handleField(field.fieldKey, e.target.value)}
                  placeholder={field.placeholder ?? ""}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              ) : field.fieldType === "toggle" ? (
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id={`cf-${field.fieldKey}`}
                    checked={
                      (customFields[field.fieldKey] ?? field.defaultValue) ===
                      "true"
                    }
                    onChange={(e) =>
                      handleField(
                        field.fieldKey,
                        e.target.checked ? "true" : "false",
                      )
                    }
                    className="w-4 h-4 rounded"
                  />
                  <label
                    htmlFor={`cf-${field.fieldKey}`}
                    className="text-sm"
                    style={{ color: "var(--admin-text)" }}>
                    {field.label}
                  </label>
                </div>
              ) : (
                <input
                  type={
                    field.fieldType === "date"
                      ? "date"
                      : field.fieldType === "number"
                        ? "number"
                        : "text"
                  }
                  value={
                    customFields[field.fieldKey] ?? field.defaultValue ?? ""
                  }
                  onChange={(e) => handleField(field.fieldKey, e.target.value)}
                  placeholder={field.placeholder ?? ""}
                  style={inputStyle}
                />
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

function SeoTab({
  seo,
  slug,
  domain,
  appName,
  pageTitle,
  onSeoSaved,
}: {
  seo?: SeoPage | null;
  slug: string;
  domain: string;
  appName: string;
  pageTitle: string;
  onSeoSaved?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const rows = seo
    ? [
        { label: "Meta Title", value: seo.title, hint: "Max 60 caratteri" },
        {
          label: "Meta Description", value: seo.description, hint: "Max 155 caratteri" },
        { label: "OG Title", value: seo.ogTitle },
        { label: "OG Description", value: seo.ogDescription },
        { label: "OG Image", value: seo.ogImage },
        { label: "Robots", value: seo.robots },
        {
          label: "JSON-LD",
          value: seo.jsonLdEnabled ? `Abilitato (${seo.jsonLdType ?? "WebPage"})` : "Disabilitato",
        },
      ]
    : [];
  return <></>;
}

function PubTab({ status, setStatus, publishedAt, setPublishedAt, expiresAt, setExpiresAt, slug }: { status: "draft" | "published"; setStatus: (v: "draft" | "published") => void; publishedAt: string; setPublishedAt: (v: string) => void; expiresAt: string; setExpiresAt: (v: string) => void; slug: string; }) { return <div />; }
function StrutturaTab({ pages, templates, parentId, onParentChange, templateId, setTemplateId, setCustomFields, currentPageId, templateLocked }: { pages: Page[]; templates: TemplateWithFields[]; parentId: number | null; onParentChange: (v: number | null) => void; templateId: number | null; setTemplateId: (v: number | null) => void; setCustomFields: (v: Record<string, string>) => void; currentPageId?: number; templateLocked?: boolean; }) { return <div />; }
function buildPreviewUrl(domain: string, slug: string): string | null { if (!domain || !slug) return null; let base = domain.trim(); if (!base.startsWith("http")) base = `https://${base}`; base = base.replace(/\/+$/, ""); return `${base}/${slug}`; }
export default function PageEditor() { return <div />; }
function toDatetimeLocal(date: Date): string { const d = new Date(date); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
