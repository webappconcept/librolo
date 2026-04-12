/**
 * Layout isolato per il frontend pubblico.
 * NON eredita font, variabili CSS o classi dell'admin.
 * I template hanno controllo totale sul proprio stile.
 *
 * Snippet globali iniettati tramite next/script (Strategy="afterInteractive"
 * per script JS) e tag nativi per CSS/style/raw dentro <head>.
 */
import "./frontend.css";
import { getActiveSnippets } from "@/lib/db/snippets-queries";
import type { SiteSnippet, SnippetType } from "@/lib/db/schema";
import Script from "next/script";

/**
 * Snippet da mettere dentro <head>:
 * - link_css  → <link>
 * - style     → <style>
 * - raw       → dangerouslySetInnerHTML (meta tag, ecc.)
 */
function HeadSnippet({ s }: { s: SiteSnippet }) {
  const t = s.type as SnippetType;
  switch (t) {
    case "link_css":
      return <link rel="stylesheet" href={s.content} />;
    case "style":
      // eslint-disable-next-line react/no-danger
      return <style dangerouslySetInnerHTML={{ __html: s.content }} />;
    case "script_src":
      // Script src in head → usiamo next/script con strategy="beforeInteractive"
      return <Script src={s.content} strategy="beforeInteractive" />;
    case "script":
      // Script inline in head → strategy="beforeInteractive" + dangerouslySetInnerHTML
      return (
        <Script
          id={`snippet-head-${s.id}`}
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: s.content }}
        />
      );
    case "raw":
    default:
      // eslint-disable-next-line react/no-danger
      return <div dangerouslySetInnerHTML={{ __html: s.content }} style={{ display: "none" }} />;
  }
}

/**
 * Snippet da mettere prima di </body>:
 * - script_src → <Script strategy="afterInteractive">
 * - script     → <Script strategy="afterInteractive" inline>
 * - link_css   → <link> (non comune, ma supportato)
 * - style      → <style>
 * - raw        → dangerouslySetInnerHTML
 */
function BodySnippet({ s }: { s: SiteSnippet }) {
  const t = s.type as SnippetType;
  switch (t) {
    case "script_src":
      return <Script src={s.content} strategy="afterInteractive" />;
    case "script":
      return (
        <Script
          id={`snippet-body-${s.id}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: s.content }}
        />
      );
    case "link_css":
      return <link rel="stylesheet" href={s.content} />;
    case "style":
      // eslint-disable-next-line react/no-danger
      return <style dangerouslySetInnerHTML={{ __html: s.content }} />;
    case "raw":
    default:
      // eslint-disable-next-line react/no-danger
      return <div dangerouslySetInnerHTML={{ __html: s.content }} style={{ display: "contents" }} />;
  }
}

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const snippets = await getActiveSnippets();
  const headSnippets = snippets.filter((s) => s.position === "head");
  const bodySnippets = snippets.filter((s) => s.position === "body_end");

  return (
    <html lang="it">
      <head>
        {headSnippets.map((s) => (
          <HeadSnippet key={s.id} s={s} />
        ))}
      </head>
      <body>
        {children}
        {bodySnippets.map((s) => (
          <BodySnippet key={s.id} s={s} />
        ))}
      </body>
    </html>
  );
}
