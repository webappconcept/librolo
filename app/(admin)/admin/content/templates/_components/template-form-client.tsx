"use client";

import type { TemplateField } from "@/lib/db/schema";
import { slugify, slugToPascalCase } from "@/lib/utils/slugify";
import {
  Check,
  Code2,
  Copy,
  FileCode2,
  GripVertical,
  Info,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useEffect, useRef, useState } from "react";
import { EditorPageHeader } from "../../../_components/editor-page-header";

const FORM_ID = "template-editor-form";
const FIELD_TYPES = [
  { value: "text", label: "Testo breve" },
  { value: "textarea", label: "Testo lungo" },
  { value: "richtext", label: "Rich text" },
  { value: "image", label: "Immagine (URL)" },
  { value: "url", label: "URL" },
  { value: "date", label: "Data" },
  { value: "select", label: "Selezione" },
  { value: "toggle", label: "Toggle" },
  { value: "number", label: "Numero" },
];
interface FieldDraft { _id: string; fieldKey: string; fieldType: string; label: string; placeholder: string; required: boolean; defaultValue: string; options: string; }
interface TemplateOption { id: number; name: string; slug: string; }
interface TemplateFormClientProps {
  template?: { id: number; name: string; slug: string; description: string; styleConfig: Record<string, unknown>; fields: TemplateField[]; isSystem: boolean; };
  allTemplates?: TemplateOption[];
  saveAction: (formData: FormData) => Promise<void>;
}
function uid() { return Math.random().toString(36).slice(2); }
export default function TemplateFormClient({ template, allTemplates = [], saveAction }: TemplateFormClientProps) {
  const isEdit = !!template;
  const [name, setName] = useState(template?.name ?? "");
  const [slug, setSlug] = useState(template?.slug ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [allowedChildIds, setAllowedChildIds] = useState<number[]>(() => {
    const raw = template?.styleConfig?.allowedChildTemplateIds;
    if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
    return [];
  });
  const [fields, setFields] = useState<FieldDraft[]>((template?.fields ?? []).map((f) => ({ _id: uid(), fieldKey: f.fieldKey, fieldType: f.fieldType, label: f.label, placeholder: f.placeholder ?? "", required: f.required, defaultValue: f.defaultValue ?? "", options: f.options ?? "{}" })));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (!isEdit) setSlug(slugify(name)); }, [name, isEdit]);
  useEffect(() => { if (!savedAt) return; const t = setTimeout(() => setSavedAt(null), 4000); return () => clearTimeout(t); }, [savedAt]);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const fd = new FormData();
      if (template?.id) fd.set("id", String(template.id));
      fd.set("name", name); fd.set("slug", slug); fd.set("description", description);
      fd.set("fieldsJson", JSON.stringify(fields.map((f, i) => ({ fieldKey: f.fieldKey, fieldType: f.fieldType, label: f.label, placeholder: f.placeholder || null, required: f.required, defaultValue: f.defaultValue || null, options: f.options, sortOrder: i }))));
      fd.set("allowedChildTemplateIdsJson", JSON.stringify(allowedChildIds));
      await saveAction(fd);
      setSavedAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) { if (isRedirectError(err)) throw err; setError("Errore durante il salvataggio. Riprova."); }
    finally { setSaving(false); }
  }
  return (
    <form id={FORM_ID} ref={formRef} onSubmit={handleSubmit}>
      <EditorPageHeader
        breadcrumbs={[{ label: "Pages", href: "/admin/content/pages" }, { label: "Template", href: "/admin/content/templates" }]}
        currentLabel={isEdit ? name || template?.name || "Edit template" : name || "New template"}
        backHref="/admin/content/templates"
        saveLabel={isEdit ? "Salva modifiche" : "Crea template"}
        formId={FORM_ID}
        isPending={saving}
        savedAt={savedAt}
        error={error}
      />
      <div />
    </form>
  );
}
