"use client";

import { useRef, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { TemplateField } from "@/lib/db/schema";

const FIELD_TYPES = [
  { value: "text",     label: "Testo breve" },
  { value: "textarea", label: "Testo lungo" },
  { value: "richtext", label: "Rich text" },
  { value: "image",    label: "Immagine (URL)" },
  { value: "url",      label: "URL" },
  { value: "date",     label: "Data" },
  { value: "select",   label: "Selezione" },
  { value: "toggle",   label: "Toggle" },
  { value: "number",   label: "Numero" },
];

interface FieldDraft {
  _id: string;
  fieldKey: string;
  fieldType: string;
  label: string;
  placeholder: string;
  required: boolean;
  defaultValue: string;
  options: string;
}

interface LayoutBaseOption {
  key: string;
  label: string;
  description: string;
}

interface TemplateFormClientProps {
  template?: {
    id: number;
    name: string;
    slug: string;
    description: string;
    layoutBase: string;
    styleConfig: Record<string, string>;
    fields: TemplateField[];
    isSystem: boolean;
  };
  layoutBases: LayoutBaseOption[];
  saveAction: (formData: FormData) => Promise<void>;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function TemplateFormClient({
  template,
  layoutBases,
  saveAction,
}: TemplateFormClientProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [slug, setSlug] = useState(template?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!template?.slug);
  const [description, setDescription] = useState(template?.description ?? "");
  const [layoutBase, setLayoutBase] = useState(template?.layoutBase ?? "default");

  const sc = template?.styleConfig ?? {};
  const [colorPrimary, setColorPrimary] = useState(sc.colorPrimary ?? "#01696f");
  const [colorBg, setColorBg] = useState(sc.colorBg ?? "#ffffff");
  const [colorText, setColorText] = useState(sc.colorText ?? "#1a1a1a");
  const [fontBody, setFontBody] = useState(sc.fontBody ?? "");
  const [fontDisplay, setFontDisplay] = useState(sc.fontDisplay ?? "");
  const [spacing, setSpacing] = useState(sc.spacing ?? "normal");
  const [borderRadius, setBorderRadius] = useState(sc.borderRadius ?? "medium");

  const [fields, setFields] = useState<FieldDraft[]>(
    (template?.fields ?? []).map((f) => ({
      _id: uid(),
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      label: f.label,
      placeholder: f.placeholder ?? "",
      required: f.required,
      defaultValue: f.defaultValue ?? "",
      options: f.options ?? "{}",
    }))
  );

  const formRef = useRef<HTMLFormElement>(null);

  function autoSlug(val: string) {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100);
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { _id: uid(), fieldKey: "", fieldType: "text", label: "", placeholder: "", required: false, defaultValue: "", options: "{}" },
    ]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f._id !== id));
  }

  function updateField<K extends keyof FieldDraft>(id: string, key: K, value: FieldDraft[K]) {
    setFields((prev) => prev.map((f) => (f._id === id ? { ...f, [key]: value } : f)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("fieldsJson", JSON.stringify(
      fields.map((f, i) => ({
        fieldKey: f.fieldKey,
        fieldType: f.fieldType,
        label: f.label,
        placeholder: f.placeholder || null,
        required: f.required,
        defaultValue: f.defaultValue || null,
        options: f.options,
        sortOrder: i,
      }))
    ));
    await saveAction(fd);
  }

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--admin-input-bg)",
    border: "1px solid var(--admin-border)",
    color: "var(--admin-text)",
  };
  const labelCls = "block text-xs font-medium mb-1";

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {template?.id && <input type="hidden" name="id" value={template.id} />}

      {/* Informazioni base */}
      <section className="rounded-xl p-5 mb-5" style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>Informazioni base</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Nome *</label>
            <input name="name" required value={name}
              onChange={(e) => { setName(e.target.value); if (!slugManual) setSlug(autoSlug(e.target.value)); }}
              className={inputCls} style={inputStyle} placeholder="Es. Articolo blog"
            />
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Slug *</label>
            <input name="slug" required value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
              className={inputCls} style={inputStyle} placeholder="articolo-blog"
              disabled={template?.isSystem}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Descrizione</label>
            <textarea name="description" value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2} className={inputCls} style={inputStyle}
              placeholder="Breve descrizione dell'uso del template…"
            />
          </div>
        </div>
      </section>

      {/* Layout base */}
      <section className="rounded-xl p-5 mb-5" style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>Layout base</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {layoutBases.map((lb) => (
            <label key={lb.key} className="relative flex flex-col gap-1 rounded-lg p-3 cursor-pointer"
              style={{
                background: layoutBase === lb.key ? "var(--admin-accent-light, #e0f2f1)" : "var(--admin-input-bg)",
                border: `2px solid ${layoutBase === lb.key ? "var(--admin-accent)" : "var(--admin-border)"}`,
              }}
            >
              <input type="radio" name="layoutBase" value={lb.key}
                checked={layoutBase === lb.key} onChange={() => setLayoutBase(lb.key)}
                className="sr-only"
              />
              <span className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>{lb.label}</span>
              <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>{lb.description}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Stile grafico */}
      <section className="rounded-xl p-5 mb-5" style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>Stile grafico</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: "colorPrimary", label: "Colore primario", value: colorPrimary, set: setColorPrimary },
            { name: "colorBg",      label: "Sfondo pagina",   value: colorBg,      set: setColorBg },
            { name: "colorText",    label: "Testo",           value: colorText,    set: setColorText },
          ].map(({ name: n, label, value, set }) => (
            <div key={n}>
              <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" name={n} value={value} onChange={(e) => set(e.target.value)}
                  className="w-10 h-9 rounded cursor-pointer border-0 p-0.5"
                  style={{ background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)" }}
                />
                <input type="text" value={value} onChange={(e) => set(e.target.value)}
                  className={inputCls} style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
          ))}
          <div>
            <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Font body</label>
            <input name="fontBody" value={fontBody} onChange={(e) => setFontBody(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="'Inter', sans-serif"
            />
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Font display</label>
            <input name="fontDisplay" value={fontDisplay} onChange={(e) => setFontDisplay(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="'Playfair Display', serif"
            />
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Spaziatura</label>
            <select name="spacing" value={spacing} onChange={(e) => setSpacing(e.target.value)}
              className={inputCls} style={inputStyle}
            >
              <option value="compact">Compatta</option>
              <option value="normal">Normale</option>
              <option value="spacious">Spaziosa</option>
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Border radius</label>
            <select name="borderRadius" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)}
              className={inputCls} style={inputStyle}
            >
              <option value="none">Nessuno</option>
              <option value="small">Piccolo</option>
              <option value="medium">Medio</option>
              <option value="large">Grande</option>
            </select>
          </div>
        </div>
      </section>

      {/* Campi custom */}
      <section className="rounded-xl p-5 mb-6" style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            Campi custom ({fields.length})
          </h2>
          <button type="button" onClick={addField}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: "var(--admin-accent)", color: "#fff" }}
          >
            <Plus size={13} /> Aggiungi campo
          </button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: "var(--admin-text-muted)" }}>
            Nessun campo — il template usa solo il contenuto principale
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field._id} className="rounded-lg p-3"
              style={{ background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={14} style={{ color: "var(--admin-text-faint)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--admin-text)" }}>Campo</span>
                <button type="button" onClick={() => removeField(field._id)}
                  className="ml-auto p-1 rounded" style={{ color: "var(--admin-error, #dc2626)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Chiave (key) *</label>
                  <input value={field.fieldKey}
                    onChange={(e) => updateField(field._id, "fieldKey", e.target.value)}
                    placeholder="es. coverImage" className={inputCls} style={inputStyle} required
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Etichetta *</label>
                  <input value={field.label}
                    onChange={(e) => updateField(field._id, "label", e.target.value)}
                    placeholder="es. Immagine copertina" className={inputCls} style={inputStyle} required
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Tipo</label>
                  <select value={field.fieldType}
                    onChange={(e) => updateField(field._id, "fieldType", e.target.value)}
                    className={inputCls} style={inputStyle}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Placeholder</label>
                  <input value={field.placeholder}
                    onChange={(e) => updateField(field._id, "placeholder", e.target.value)}
                    className={inputCls} style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--admin-text-muted)" }}>Valore default</label>
                  <input value={field.defaultValue}
                    onChange={(e) => updateField(field._id, "defaultValue", e.target.value)}
                    className={inputCls} style={inputStyle}
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id={`req-${field._id}`}
                    checked={field.required}
                    onChange={(e) => updateField(field._id, "required", e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor={`req-${field._id}`} className="text-xs" style={{ color: "var(--admin-text)" }}>
                    Obbligatorio
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottoni */}
      <div className="flex items-center gap-3">
        <button type="submit" className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--admin-accent)" }}
        >
          Salva template
        </button>
        <a href="/admin/template" className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "var(--admin-input-bg)", color: "var(--admin-text)", border: "1px solid var(--admin-border)" }}
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
