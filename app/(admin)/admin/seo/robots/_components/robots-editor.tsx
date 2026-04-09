"use client";

import { AlertCircle, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { saveRobotsAction } from "../actions";

const DEFAULT_ROBOTS = `User-agent: *
Allow: /

# Blocca l'area admin
Disallow: /admin/

# Sitemap
# Sitemap: https://tuodominio.it/sitemap.xml`;

const DEFAULT_HUMANS = `/* TEAM */
Chef: Nome Cognome
Site: https://tuodominio.it
Location: Italia

/* SITE */
Last update: ${new Date().toISOString().slice(0, 10)}
Language: Italian
Doctype: HTML5
IDE: VS Code`;

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

const textareaStyle = {
  background: "var(--admin-page-bg)",
  border: "1px solid var(--admin-input-border)",
  color: "var(--admin-text)",
  borderRadius: "0.5rem",
  padding: "0.75rem 1rem",
  fontSize: "0.8125rem",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  lineHeight: "1.6",
  width: "100%",
  outline: "none",
  resize: "vertical" as const,
};

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2.5"
      style={{
        background: "var(--admin-info-bg, color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg)))",
        border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
      }}>
      <Info size={13} className="mt-0.5 shrink-0" style={{ color: "var(--admin-accent)" }} />
      <p className="text-xs leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
        {children}
      </p>
    </div>
  );
}

export default function RobotsEditor({
  initialRobots,
  initialHumans,
}: {
  initialRobots: string;
  initialHumans: string;
}) {
  const [state, action, isPending] = useActionState(saveRobotsAction, {});
  const [robots, setRobots] = useState(initialRobots || DEFAULT_ROBOTS);
  const [humans, setHumans] = useState(initialHumans || DEFAULT_HUMANS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state?.success]);

  return (
    <form action={action} className="space-y-6">
      {/* robots.txt */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p style={labelStyle}>robots.txt</p>
            <p style={hintStyle}>Servito automaticamente su <code className="font-mono">/robots.txt</code></p>
          </div>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: "var(--admin-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            Visualizza live <ExternalLink size={11} />
          </a>
        </div>

        <InfoBox>
          Controlla quali pagine i crawler dei motori di ricerca possono o non possono scansionare.{" "}
          Usa <code className="font-mono">Disallow: /percorso/</code> per bloccare una sezione e{" "}
          <code className="font-mono">Allow: /percorso/</code> per consentirla esplicitamente.
        </InfoBox>

        <textarea
          name="robots_txt"
          value={robots}
          onChange={(e) => setRobots(e.target.value)}
          rows={12}
          spellCheck={false}
          style={textareaStyle}
        />
        <p style={hintStyle}>{robots.length.toLocaleString("it")} caratteri</p>
      </div>

      {/* humans.txt */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p style={labelStyle}>humans.txt</p>
            <p style={hintStyle}>Servito automaticamente su <code className="font-mono">/humans.txt</code></p>
          </div>
          <a
            href="/humans.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: "var(--admin-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            Visualizza live <ExternalLink size={11} />
          </a>
        </div>

        <InfoBox>
          File informativo opzionale che descrive il team e le tecnologie usate nel progetto.{" "}
          Vedi lo standard su{" "}
          <a
            href="https://humanstxt.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--admin-accent)", textDecoration: "underline" }}>
            humanstxt.org
          </a>.
        </InfoBox>

        <textarea
          name="humans_txt"
          value={humans}
          onChange={(e) => setHumans(e.target.value)}
          rows={10}
          spellCheck={false}
          style={textareaStyle}
        />
        <p style={hintStyle}>{humans.length.toLocaleString("it")} caratteri</p>
      </div>

      {/* Error */}
      {state?.error && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{
            color: "var(--admin-error, #ef4444)",
            background: "color-mix(in srgb, #ef4444 10%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)",
          }}>
          <AlertCircle size={14} />
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--admin-success, #22c55e)" }}>
            <CheckCircle2 size={15} />
            Salvato con successo
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-60"
          style={{ background: "var(--admin-accent)" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}>
          {isPending && (
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          Salva modifiche
        </button>
      </div>
    </form>
  );
}
