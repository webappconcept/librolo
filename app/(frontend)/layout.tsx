/**
 * Layout isolato per il frontend pubblico.
 * NON eredita font, variabili CSS o classi dell'admin.
 * I template hanno controllo totale sul proprio stile.
 *
 * Gli snippet globali (Analytics, Meta Pixel, CSS esterni, ecc.) vengono
 * iniettati qui leggendo la tabella site_snippets (cache 1h).
 */
import "./frontend.css";
import { getActiveSnippets } from "@/lib/db/snippets-queries";
import type { SiteSnippet, SnippetType } from "@/lib/db/schema";

/** Costruisce il tag HTML corretto per un dato snippet. */
function renderSnippet(s: SiteSnippet): React.ReactNode {
  const t = s.type as SnippetType;
  switch (t) {
    case "link_css":
      return (
        <link
          key={s.id}
          rel="stylesheet"
          href={s.content}
        />
      );
    case "style":
      return (
        // eslint-disable-next-line react/no-danger
        <style key={s.id} dangerouslySetInnerHTML={{ __html: s.content }} />
      );
    case "script_src":
      return (
        <script
          key={s.id}
          src={s.content}
          defer
        />
      );
    case "script":
      return (
        // eslint-disable-next-line react/no-danger
        <script key={s.id} dangerouslySetInnerHTML={{ __html: s.content }} />
      );
    case "raw":
    default:
      return (
        // eslint-disable-next-line react/no-danger
        <div
          key={s.id}
          dangerouslySetInnerHTML={{ __html: s.content }}
          style={{ display: "contents" }}
        />
      );
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
      {/* Snippet testa — Next.js li muove automaticamente dentro <head> */}
      {headSnippets.map(renderSnippet)}

      {children}

      {/* Snippet fine body */}
      {bodySnippets.map(renderSnippet)}
    </>
  );
}
