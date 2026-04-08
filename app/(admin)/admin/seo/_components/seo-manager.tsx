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
  WebPage: "Pagina web generica \u2014 ideale per homepage e pagine istituzionali",
  Article: "Articolo o notizia \u2014 migliora l'aspetto nei risultati di Google News",
  BlogPosting: "Post di blog \u2014 simile ad Article, ottimizzato per contenuti blog",
  Product: "Scheda prodotto \u2014 mostra prezzo e disponibilit\u00e0 nei risultati",
  FAQPage: "Pagina FAQ \u2014 abilita i rich result con domande e risposte espansi",
  BreadcrumbList: "Breadcrumb \u2014 mostra il percorso di navigazione nei risultati",
  Organization: "Organizzazione \u2014 dati aziendali (nome, logo, contatti)",
  LocalBusiness: "Attivit\u00e0 locale \u2014 indirizzo, orari e valutazioni su Google Maps",
  Person: "Persona \u2014 profilo autore o collaboratore",
  Event: "Evento \u2014 data, luogo e biglietti nei risultati di ricerca",
  VideoObject: "Video \u2014 miniatura e durata nei rich result di YouTube/Google",
};

function charClass(len: number, max: number) {
  if (len === 0) return "text-gray-400";
  if (len > max) return "text-red-500 font-semibold";
  if (len > max * 0.9) return "text-amber-500";
  return "text-green-600";
}

function resolvePreview(text: string, appName: string): string {
  if (!appName || !text) return text;
  return text.replace(/\{appName\}/gi, appName);
}

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
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Anteprima Google</p>
        {isNoIndex && (
          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            noindex \u2014 non verr\u00e0 indicizzata
          </span>
        )}
      </div>
      <p className="text-[#1a0dab] text-base font-medium truncate">
        {title || <span className="text-gray-400 italic">Titolo non impostato</span>}
      </p>
      <p className="text-[#006621] text-xs">{displayDomain}{pathname}</p>
      <p className="text-[#545454] text-sm mt-0.5 line-clamp-2">
        {description || <span className="text-gray-400 italic">Descrizione non impostata</span>}
      </p>
    </div>
  );
}

function AppNameHint({ appName }: { appName: string }) {
  if (!appName) return null;
  return (
    <p className="text-xs text-gray-400">
      Usa{" "}
      <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">
        {"{"}appName{"}"}
      </code>{" "}
      per inserire automaticamente il nome dell&apos;app:{" "}
      <strong className="text-gray-500">{appName}</strong>.
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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
        <input type="hidden" name={name} value={checked ? "true" : "false"} />
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e07a3a] focus-visible:ring-offset-2 ${
            checked ? "bg-[#e07a3a]" : "bg-gray-200"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {isEdit ? "Modifica pagina" : "Aggiungi pagina"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form action={action} className="px-6 py-5 space-y-5">
          {isEdit && (
            <input type="hidden" name="originalPathname" value={page!.pathname} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pagina</label>
              {isEdit ? (
                <>
                  <input type="hidden" name="pathname" value={page!.pathname} />
                  <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono">
                    {page!.pathname}
                  </div>
                  <p className="text-xs text-gray-400">Il percorso URL non pu\u00f2 essere modificato.</p>
                </>
              ) : unconfiguredRoutes.length > 0 ? (
                <>
                  <select
                    name="pathname"
                    value={pathname}
                    onChange={(e) => setPathname(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a] bg-white">
                    <option value="">Seleziona una pagina...</option>
                    {unconfiguredRoutes.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {/* Avviso provenienza lista */}
                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                    <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-600 leading-relaxed">
                      La lista dei percorsi è definita in{" "}
                      <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-700">lib/routes.ts</code>
                      {" "}(voci di navigazione, footer e route pubbliche).{" "}
                      Se una pagina non compare, aggiungila prima a quel file.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <span className="text-green-600 text-sm">\u2713</span>
                  <p className="text-xs text-green-700 font-medium">Tutte le pagine dell&apos;app sono gi\u00e0 configurate.</p>
                </div>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nome (uso interno)</label>
              <input
                name="label"
                defaultValue={page?.label ?? ""}
                placeholder="Es: Pagina Esplora"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a]"
              />
            </div>
          </div>

          <Serp
            title={resolvePreview(title, appName)}
            description={resolvePreview(description, appName)}
            pathname={pathname}
            domain={domain}
            robots={robots}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta Title</label>
              <span className={`text-xs ${charClass(title.length, 60)}`}>{title.length}/60</span>
            </div>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={70}
              placeholder="Titolo della pagina"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a]"
            />
            <AppNameHint appName={appName} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta Description</label>
              <span className={`text-xs ${charClass(description.length, 155)}`}>{description.length}/155</span>
            </div>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Descrizione della pagina"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a] resize-none"
            />
            <AppNameHint appName={appName} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meta Robots</label>
            <select
              name="robots"
              value={robots}
              onChange={(e) => setRobots(e.target.value as RobotsValue)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a] bg-white">
              {ROBOTS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              {ROBOTS_OPTIONS.find((o) => o.value === robots)?.hint}
            </p>
          </div>

          {/* JSON-LD */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <Toggle
              name="jsonLdEnabled"
              label="JSON-LD Structured Data"
              hint={JSON_LD_TOGGLE_HINT}
              checked={jsonLdEnabled}
              onChange={handleToggleJsonLd}
            />
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                jsonLdEnabled ? "max-h-40 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="pt-1 space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo di schema</label>
                {jsonLdEnabled && (
                  <input type="hidden" name="jsonLdType" value={jsonLdType} />
                )}
                <select
                  value={jsonLdType}
                  onChange={(e) => setJsonLdType(e.target.value as JsonLdType)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a] bg-white"
                >
                  <option value="" disabled>Seleziona un tipo...</option>
                  {JSON_LD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {currentHint && <p className="text-xs text-gray-400">{currentHint}</p>}
              </div>
            </div>
          </div>

          {/* Open Graph */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 select-none">
              Open Graph (opzionale)
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">OG Title</label>
                <input
                  name="ogTitle"
                  defaultValue={page?.ogTitle ?? ""}
                  maxLength={70}
                  placeholder="Default: uguale al Meta Title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a]"
                />
                <AppNameHint appName={appName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">OG Description</label>
                <textarea
                  name="ogDescription"
                  defaultValue={page?.ogDescription ?? ""}
                  maxLength={200}
                  rows={2}
                  placeholder="Default: uguale alla Meta Description"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a] resize-none"
                />
                <AppNameHint appName={appName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">OG Image URL</label>
                <input
                  name="ogImage"
                  defaultValue={page?.ogImage ?? ""}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a]"
                />
              </div>
            </div>
          </details>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending || (!isEdit && unconfiguredRoutes.length === 0)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#e07a3a] hover:bg-[#c96830] text-white font-medium transition-colors disabled:opacity-60">
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
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca pagina..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/40 focus:border-[#e07a3a]"
          />
        </div>
        <button
          onClick={() => setEditPage("new")}
          disabled={allConfigured}
          title={allConfigured ? "Tutte le pagine sono gi\u00e0 configurate" : "Aggiungi pagina"}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#e07a3a] hover:bg-[#c96830] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus size={15} />
          Aggiungi pagina
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={36} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {search ? "Nessuna pagina trovata" : "Nessuna pagina configurata"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {!search && 'Clicca "Aggiungi pagina" per iniziare.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((page) => {
            const hasTitle = !!page.title;
            const hasDesc = !!page.description;
            const complete = hasTitle && hasDesc;
            return (
              <div
                key={page.pathname}
                className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: complete ? "#22c55e" : hasTitle || hasDesc ? "#f59e0b" : "#d1d5db",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{page.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{page.pathname}</p>
                </div>
                <div className="hidden sm:block flex-1 min-w-0">
                  {page.title ? (
                    <p className="text-xs text-gray-600 truncate">{page.title}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Nessun titolo</p>
                  )}
                  {page.description ? (
                    <p className="text-xs text-gray-400 truncate">{page.description}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Nessuna descrizione</p>
                  )}
                </div>
                {page.robots && (
                  <span className="hidden sm:inline-flex text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                    {page.robots}
                  </span>
                )}
                {page.jsonLdEnabled && page.jsonLdType && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                    LD+JSON
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditPage(page)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(page.pathname)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
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
