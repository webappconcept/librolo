/**
 * Layout isolato per il frontend pubblico.
 *
 * IMPORTANTE: non renderizza <html>/<head>/<body> — quelli
 * appartengono al RootLayout di Next.js (app/layout.tsx).
 * Gli snippet vengono iniettati tramite next/script direttamente
 * nel fragment; Next.js hoists i <Script strategy="beforeInteractive">
 * nel <head> reale da solo.
 */
import "./frontend.css";
import { getActiveSnippets } from "@/lib/db/snippets-queries";
import type { SiteSnippet, SnippetType } from "@/lib/db/schema";
import Script from "next/script";

/**
 * Snippet con position="head":
 * - link_css  → <link> (hoistato da Next.js nel <head>)
 * - style     → <style>
 * - script_src → <Script strategy="beforeInteractive">
 * - script    → <Script strategy="beforeInteractive" inline>
 * - raw       → dangerouslySetInnerHTML in un fragment nascosto
 *
 * NOTA: <link> e <style> renderizzati dentro il body vengono
 * automaticamente spostati nel <head> dal browser e da Next.js.
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
      return <Script src={s.content} strategy="beforeInteractive" />;
    case "script":
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
      return <span dangerouslySetInnerHTML={{ __html: s.content }} style={{ display: "none" }} />;
  }
}

/**
 * Snippet con position="body_end".
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
      return <span dangerouslySetInnerHTML={{ __html: s.content }} style={{ display: "none" }} />;
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
    <>
      {/* Snippet head — Next.js li hoista nel <head> corretto */}
      {headSnippets.map((s) => (
        <HeadSnippet key={s.id} s={s} />
      ))}

      {/* Contenuto pagina */}
      {children}

      {/* Snippet body_end */}
      {bodySnippets.map((s) => (
        <BodySnippet key={s.id} s={s} />
      ))}
    </>
  );
}
