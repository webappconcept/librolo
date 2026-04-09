"use client";

import type { SeoPage } from "@/lib/db/schema";
import { FileText, Info, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteSeoPageAction, upsertSeoPageAction } from "../actions";
import { JSON_LD_TYPES, type JsonLdType } from "./jsonld-types";

type RobotsValue = "" | "noindex,nofollow" | "noindex,follow";

const ROBOTS_OPTIONS: { value: RobotsValue; label: string; hint: string }[] = [
  { value: "", label: "Default (index, follow)", hint: "La pagina viene indicizzata normalmente" },
  { value: "noindex,nofollow", label: "noindex, nofollow", hint: "Non indicizzare, non seguire i link" },
  { value: "noindex,follow", label: "noindex, follow", hint: "Non indicizzare, ma segui i link" },
];

const JSON_LD_TOGGLE_HINT =
  'Inietta un blocco <script type="application/ld+json"> nella pagina per i rich result di Google.';

const JSON_LD_TYPE_HINTS: Record<JsonLdType, string> = {
  WebPage: "Pagina web generica — ideale per homepage e pagine istituzionali",
  Article: "Articolo o notizia — migliora l'aspetto nei risultati di Google News",
  BlogPosting: "Post di blog — simile ad Article, ottimizzato per contenuti blog",
  Product: "Scheda prodotto — mostra prezzo e disponibilità nei risultati",
  FAQPage: "Pagina FAQ — abilita i rich result con domande e risposte espansi",
  BreadcrumbList: "Breadcrumb — mostra il percorso di navigazione nei risultati",
  Organization: "Organizzazione — dati aziendali (nome, logo, contatti)",
  LocalBusiness: "Attività locale — indirizzo, orari e valutazioni su Google Maps",
  Person: "Persona — profilo autore o collaboratore",
  Event: "Evento — data, luogo e biglietti nei risultati di ricerca",
  VideoObject: "Video — miniatura e durata nei rich result di YouTube/Google",
};

function charClass(len: number, max: number) {
  if (len === 0) return "";
  if (len > max) return "char-over";
  if (len > max * 0.9) return "char-warn";
  return "char-ok";
}

function resolvePreview(text: string, appName: string): string {
  if (!appName || !text) return text;
  return text.replace(/\{appName\}/gi, appName);
}

// ─── Input / Textarea / Select shared style ───────────────────────────────────
const inputStyle = {
  background: "var(--admin-page-bg)",
  border: "1px solid var(--admin-input-border)",
  color: "var(--admin-text)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
} as React.CSSProperties;

const labelStyle = {
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "var(--admin-text-muted)",
};

const hintStyle = {
  fontSize: "0.75rem",
  color: "var(--admin-text-faint)",
};

// ─── SERP preview ─────────────────────────────────────────────────────────────
function Serp({
  title,
  description,
  pathname,
  domain,
  robots,
}: {
  title: string;
  description: string;
  pathname: string;
  domain: string;
  robots: RobotsValue;
}) {
  const displayDomain = domain || "https://il-tuo-dominio.it";
  const isNoIndex = robots.startsWith("noindex");
  return (
    <div
      className="rounded-lg p-4 text-sm"
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-card-border)",
      }}>
      <div className="flex items-center justify-between mb-1">
        <p style={{ ...hintStyle, textTransform: "uppercase", letterSpacing: "0.06em" }}>Anteprima Google</p>
        {isNoIndex && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
              color: "var(--admin-accent)",
              border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
            }}>
            noindex &mdash; non verrà indicizzata
          </span>
        )}
      </div>
      <p className="text-base font-medium truncate" style={{ color: "#1a0dab" }}>
        {title || <span style={hintStyle}><em>Titolo non impostato</em></span>}
      </p>
      <p className="text-xs" style={{ color: "#006621" }}>{displayDomain}{pathname}</p>
      <p className="text-sm mt-0.5 line-clamp-2" style={{ color: "#545454" }}>
        {description || <span style={hintStyle}><em>Descrizione non impostata</em></span>}
      </p>
    </div>
  );
}

function AppNameHint({ appName }: { appName: string }) {
  if (!appName) return null;
  return (
    <p style={hintStyle}>
      Usa{" "}
      <code
        className="px-1 py-0.5 rounded font-mono"
        style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>
        {"{"}appName{"}"}
      </code>{" "}
      per inserire automaticamente il nome dell&apos;app:{" "}
      <strong style={{ color: "var(--admin-text-muted)" }}>{appName}</strong>.
    </p>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  name,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p style={labelStyle}>{label}</p>
          {hint && <p style={{ ...hintStyle, marginTop: "0.125rem" }}>{hint}</p>}
        </div>
        <input type="hidden" name={name} value={checked ? "true" : "false"} />
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
          style={{ background: checked ? "var(--admin-accent)" : "var(--admin-input-border)" }}>
          <span
            aria-hidden="true"
            className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out"
            style={{
              background: "white",
              transform: checked ? "translateX(20px)" : "translateX(0)",
            }}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Modal Form ───────────────────────────────────────────────────────────────
function SeoForm({
  page,
  domain,
  appName,
  unconfiguredRoutes,
  onClose,
}: {
  page?: SeoPage | null;
  domain: string;
  appName: string;
  unconfiguredRoutes: string[];
  onClose: () => void;
}) {
  const isEdit = !!page;
  const [state, action, isPending] = useActionState(upsertSeoPageAction, {});

  const [title, setTitle] = useState(page?.title ?? "");
  const [description, setDescription] = useState(page?.description ?? "");
  const [pathname, setPathname] = useState(page?.pathname ?? "");
  const [robots, setRobots] = useState<RobotsValue>((page?.robots as RobotsValue) ?? "");
  const [jsonLdEnabled, setJsonLdEnabled] = useState<boolean>(page?.jsonLdEnabled === true);
  const [jsonLdType, setJsonLdType] = useState<JsonLdType | "">(
    (page?.jsonLdType as JsonLdType | null | undefined) ?? ""
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  function handleToggleJsonLd(enabled: boolean) {
    setJsonLdEnabled(enabled);
    if (enabled && !jsonLdType) setJsonLdType("WebPage");
  }

  const currentHint =
    jsonLdType && jsonLdType in JSON_LD_TYPE_HINTS
      ? JSON_LD_TYPE_HINTS[jsonLdType as JsonLdType]
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--admin-divider)" }}>
          <h2 className="font-semibold" style={{ color: "var(--admin-text)" }}>
            {isEdit ? "Modifica pagina" : "Aggiungi pagina"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--admin-text-faint)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--admin-hover-bg)";
              e.currentTarget.style.color = "var(--admin-text-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--admin-text-faint)";
            }}>
            <X size={18} />
          </button>
        </div>

        <form action={action} className="px-6 py-5 space-y-5">
          {isEdit && <input type="hidden" name="originalPathname" value={page!.pathname} />}

          {/* Pagina */}
          <div className="space-y-1.5">
            <label style={labelStyle}>Pagina</label>
            {isEdit ? (
              <>
                <input type="hidden" name="pathname" value={page!.pathname} />
                <div
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                  style={{
                    background: "var(--admin-hover-bg)",
                    border: "1px solid var(--admin-input-border)",
                    color: "var(--admin-text-muted)",
                  }}>
                  {page!.pathname}
                </div>
                <p style={hintStyle}>Il percorso URL non può essere modificato.</p>
              </>
            ) : unconfiguredRoutes.length > 0 ? (
              <>
                <select
                  name="pathname"
                  value={pathname}
                  onChange={(e) => setPathname(e.target.value)}
                  style={inputStyle}>
                  <option value="">Seleziona una pagina...</option>
                  {unconfiguredRoutes.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                  style={{
                    background: "var(--admin-info-bg, color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg)))",
                    border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
                  }}>
                  <Info size={13} className="mt-0.5 shrink-0" style={{ color: "var(--admin-accent)" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
                    La lista dei percorsi è definita in{" "}
                    <code
                      className="font-mono px-1 py-0.5 rounded"
                      style={{ background: "var(--admin-hover-bg)", color: "var(--admin-accent)" }}>
                      lib/routes.ts
                    </code>
                    {" "}(voci di navigazione, footer e route pubbliche).{" "}
                    Se una pagina non compare, aggiungila prima a quel file.
                  </p>
                </div>
              </>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: "color-mix(in srgb, #22c55e 8%, var(--admin-card-bg))",
                  border: "1px solid color-mix(in srgb, #22c55e 25%, transparent)",
                }}>
                <span style={{ color: "#22c55e" }}>✓</span>
                <p className="text-xs font-medium" style={{ color: "var(--admin-text-muted)" }}>
                  Tutte le pagine dell&apos;app sono già configurate.
                </p>
              </div>
            )}
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <label style={labelStyle}>Nome (uso interno)</label>
            <input
              name="label"
              defaultValue={page?.label ?? ""}
              placeholder="Es: Pagina Esplora"
              style={inputStyle}
            />
          </div>

          {/* SERP preview */}
          <Serp
            title={resolvePreview(title, appName)}
            description={resolvePreview(description, appName)}
            pathname={pathname}
            domain={domain}
            robots={robots}
          />

          {/* Meta Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label style={labelStyle}>Meta Title</label>
              <span
                className="text-xs"
                style={{
                  color:
                    title.length === 0
                      ? "var(--admin-text-faint)"
                      : title.length > 60
                      ? "var(--admin-error, #ef4444)"
                      : title.length > 54
                      ? "var(--admin-warning, #d97706)"
                      : "var(--admin-success, #22c55e)",
                }}>
                {title.length}/60
              </span>
            </div>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={70}
              placeholder="Titolo della pagina"
              style={inputStyle}
            />
            <AppNameHint appName={appName} />
          </div>

          {/* Meta Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label style={labelStyle}>Meta Description</label>
              <span
                className="text-xs"
                style={{
                  color:
                    description.length === 0
                      ? "var(--admin-text-faint)"
                      : description.length > 155
                      ? "var(--admin-error, #ef4444)"
                      : description.length > 139
                      ? "var(--admin-warning, #d97706)"
                      : "var(--admin-success, #22c55e)",
                }}>
                {description.length}/155
              </span>
            </div>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Descrizione della pagina"
              style={{ ...inputStyle, resize: "none" }}
            />
            <AppNameHint appName={appName} />
          </div>

          {/* Meta Robots */}
          <div className="space-y-1.5">
            <label style={labelStyle}>Meta Robots</label>
            <select
              name="robots"
              value={robots}
              onChange={(e) => setRobots(e.target.value as RobotsValue)}
              style={inputStyle}>
              {ROBOTS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={hintStyle}>
              {ROBOTS_OPTIONS.find((o) => o.value === robots)?.hint}
            </p>
          </div>

          {/* JSON-LD */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "var(--admin-hover-bg)",
              border: "1px solid var(--admin-card-border)",
            }}>
            <Toggle
              name="jsonLdEnabled"
              label="JSON-LD Structured Data"
              hint={JSON_LD_TOGGLE_HINT}
              checked={jsonLdEnabled}
              onChange={handleToggleJsonLd}
            />
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{ maxHeight: jsonLdEnabled ? "140px" : "0px", opacity: jsonLdEnabled ? 1 : 0 }}>
              <div className="pt-1 space-y-1.5">
                <label style={labelStyle}>Tipo di schema</label>
                {jsonLdEnabled && (
                  <input type="hidden" name="jsonLdType" value={jsonLdType} />
                )}
                <select
                  value={jsonLdType}
                  onChange={(e) => setJsonLdType(e.target.value as JsonLdType)}
                  style={inputStyle}>
                  <option value="" disabled>Seleziona un tipo...</option>
                  {JSON_LD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {currentHint && <p style={hintStyle}>{currentHint}</p>}
              </div>
            </div>
          </div>

          {/* Open Graph */}
          <details className="group">
            <summary
              className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide transition-colors"
              style={{ color: "var(--admin-text-faint)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text-muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-faint)")}
            >
              Open Graph (opzionale)
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <label style={labelStyle}>OG Title</label>
                <input
                  name="ogTitle"
                  defaultValue={page?.ogTitle ?? ""}
                  maxLength={70}
                  placeholder="Default: uguale al Meta Title"
                  style={inputStyle}
                />
                <AppNameHint appName={appName} />
              </div>
              <div className="space-y-1.5">
                <label style={labelStyle}>OG Description</label>
                <textarea
                  name="ogDescription"
                  defaultValue={page?.ogDescription ?? ""}
                  maxLength={200}
                  rows={2}
                  placeholder="Default: uguale alla Meta Description"
                  style={{ ...inputStyle, resize: "none" }}
                />
                <AppNameHint appName={appName} />
              </div>
              <div className="space-y-1.5">
                <label style={labelStyle}>OG Image URL</label>
                <input
                  name="ogImage"
                  defaultValue={page?.ogImage ?? ""}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>
            </div>
          </details>

          {/* Error */}
          {state?.error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                color: "var(--admin-error, #ef4444)",
                background: "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))",
                border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)",
              }}>
              {state.error}
            </p>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-3 pt-2"
            style={{ borderTop: "1px solid var(--admin-divider)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
              style={{
                border: "1px solid var(--admin-input-border)",
                color: "var(--admin-text-muted)",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending || (!isEdit && unconfiguredRoutes.length === 0)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-60"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}>
              {isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {isEdit ? "Salva modifiche" : "Aggiungi pagina"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────
export default function SeoManager({
  initialPages,
  unconfiguredRoutes,
  domain,
  appName,
}: {
  initialPages: SeoPage[];
  unconfiguredRoutes: string[];
  domain: string;
  appName: string;
}) {
  const [search, setSearch] = useState("");
  const [editPage, setEditPage] = useState<SeoPage | null | "new">(null);
  const [, startTransition] = useTransition();

  const filtered = initialPages.filter(
    (p) =>
      p.pathname.includes(search) ||
      p.label.toLowerCase().includes(search.toLowerCase()),
  );

  function handleDelete(pathname: string) {
    if (!confirm(`Eliminare la pagina "${pathname}"?`)) return;
    startTransition(async () => {
      await deleteSeoPageAction(pathname);
    });
  }

  const allConfigured = unconfiguredRoutes.length === 0;

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
        <button
          onClick={() => setEditPage("new")}
          disabled={allConfigured}
          title={allConfigured ? "Tutte le pagine sono già configurate" : "Aggiungi pagina"}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--admin-accent)" }}
          onMouseEnter={(e) => { if (!allConfigured) e.currentTarget.style.filter = "brightness(0.9)"; }}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}>
          <Plus size={15} />
          Aggiungi pagina
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={36} className="mb-3" style={{ color: "var(--admin-text-faint)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>
            {search ? "Nessuna pagina trovata" : "Nessuna pagina configurata"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--admin-text-faint)" }}>
            {!search && 'Clicca "Aggiungi pagina" per iniziare.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((page) => {
            const hasTitle = !!page.title;
            const hasDesc = !!page.description;
            const complete = hasTitle && hasDesc;
            const displayTitle = resolvePreview(page.title ?? "", appName);
            const displayDesc = resolvePreview(page.description ?? "", appName);
            return (
              <div
                key={page.pathname}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--admin-card-bg)",
                  border: "1px solid var(--admin-card-border)",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--admin-input-border)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--admin-card-border)")}>

                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: complete ? "#22c55e" : hasTitle || hasDesc ? "#f59e0b" : "var(--admin-text-faint)",
                  }}
                />

                {/* Label + path — larghezza fissa, non cresce */}
                <div className="shrink-0 w-40 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--admin-text)" }}>
                    {page.label}
                  </p>
                  <p className="text-xs font-mono truncate" style={{ color: "var(--admin-text-faint)" }}>
                    {page.pathname}
                  </p>
                </div>

                {/* Title + desc preview — cresce e tronca */}
                <div className="hidden sm:block flex-1 min-w-0 overflow-hidden">
                  {displayTitle ? (
                    <p className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>{displayTitle}</p>
                  ) : (
                    <p className="text-xs italic" style={{ color: "var(--admin-text-faint)" }}>Nessun titolo</p>
                  )}
                  {displayDesc ? (
                    <p className="text-xs truncate" style={{ color: "var(--admin-text-faint)" }}>{displayDesc}</p>
                  ) : (
                    <p className="text-xs italic" style={{ color: "var(--admin-text-faint)" }}>Nessuna descrizione</p>
                  )}
                </div>

                {/* Badge robots + JSON-LD raggruppati — non si espandono */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {page.robots && (
                    <span
                      className="inline-flex text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{
                        background: "color-mix(in srgb, #d97706 12%, var(--admin-card-bg))",
                        color: "#d97706",
                        border: "1px solid color-mix(in srgb, #d97706 25%, transparent)",
                      }}>
                      {page.robots}
                    </span>
                  )}
                  {page.jsonLdEnabled && page.jsonLdType && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{
                        background: "color-mix(in srgb, #8b5cf6 12%, var(--admin-card-bg))",
                        color: "#8b5cf6",
                        border: "1px solid color-mix(in srgb, #8b5cf6 25%, transparent)",
                      }}>
                      {page.jsonLdType}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditPage(page)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "var(--admin-text-faint)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--admin-hover-bg)";
                      e.currentTarget.style.color = "var(--admin-text-muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--admin-text-faint)";
                    }}>
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(page.pathname)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "var(--admin-text-faint)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--admin-text-faint)";
                    }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editPage !== null && (
        <SeoForm
          page={editPage === "new" ? null : editPage}
          domain={domain}
          appName={appName}
          unconfiguredRoutes={unconfiguredRoutes}
          onClose={() => setEditPage(null)}
        />
      )}
    </>
  );
}
