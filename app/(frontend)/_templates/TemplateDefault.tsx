import type { TemplateProps } from "./types";

/**
 * Template di fallback.
 * Usato quando nessun template corrisponde allo slug della pagina.
 * Layout minimale: titolo + contenuto HTML grezzo.
 */
export function TemplateDefault({ page, isPreview }: TemplateProps) {
  return (
    <div
      style={{
        fontFamily: "inherit",
        background: "#fff",
        color: "#1a1a1a",
        minHeight: "100vh",
      }}>
      {isPreview && (
        <div
          style={{
            background: "#fbbf24",
            color: "#1a1a1a",
            textAlign: "center",
            padding: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>
          ⚠️ Anteprima — non pubblicata
        </div>
      )}
      <main
        style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1
          style={{
            fontSize: "clamp(1.875rem, 5vw, 3rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: "1.5rem",
          }}>
          {page.title}
        </h1>
        <div
          className="tpl-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
          style={{ fontSize: "1.0625rem", lineHeight: 1.8 }}
        />
      </main>
    </div>
  );
}
