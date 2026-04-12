import type { TemplateProps } from "./types";
import { styleConfigToCssVars } from "./types";

/**
 * Layout Articolo.
 * Campi custom usati:
 *   - coverImage (image)   — URL immagine hero
 *   - author     (text)    — nome autore
 *   - category   (text)    — categoria / tag
 *   - readTime   (number)  — minuti di lettura stimati
 *   - intro      (textarea)— testo di introduzione sopra il body
 */
export function TemplateArticle({
  page,
  fields,
  styleConfig,
  isPreview,
}: TemplateProps) {
  const cssVars = styleConfigToCssVars(styleConfig);

  return (
    <div
      style={{
        ...cssVars,
        fontFamily: styleConfig.fontBody ?? "inherit",
        background: styleConfig.colorBg ?? "var(--color-bg, #fff)",
        color: styleConfig.colorText ?? "var(--color-text, #1a1a1a)",
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

      {/* Hero immagine */}
      {fields.coverImage && (
        <div
          style={{
            width: "100%",
            aspectRatio: "21/9",
            overflow: "hidden",
            background: "#e5e7eb",
          }}>
          <img
            src={fields.coverImage}
            alt={page.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      <main
        style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Meta: categoria + tempo di lettura */}
        {(fields.category || fields.readTime) && (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1rem",
              fontSize: "0.8125rem",
              color: styleConfig.colorPrimary ?? "#6b7280",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
            {fields.category && <span>{fields.category}</span>}
            {fields.readTime && <span>⏱ {fields.readTime} min</span>}
          </div>
        )}
        <div>template articolo</div>
        <h1
          style={{
            fontFamily:
              styleConfig.fontDisplay ?? styleConfig.fontBody ?? "inherit",
            fontSize: "clamp(1.875rem, 5vw, 3rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: "1rem",
          }}>
          {page.title}
        </h1>

        {/* Autore */}
        {fields.author && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1.5rem",
            }}>
            Di <strong>{fields.author}</strong>
            {page.publishedAt && (
              <>
                {" "}
                —{" "}
                {new Date(page.publishedAt).toLocaleDateString("it-IT", {
                  dateStyle: "long",
                })}
              </>
            )}
          </p>
        )}

        {/* Intro */}
        {fields.intro && (
          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.7,
              color: "#374151",
              borderLeft: `3px solid ${styleConfig.colorPrimary ?? "#6b7280"}`,
              paddingLeft: "1rem",
              marginBottom: "2rem",
              fontStyle: "italic",
            }}>
            {fields.intro}
          </p>
        )}

        {/* Body content */}
        <div
          className="tpl-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
          style={{ fontSize: "1.0625rem", lineHeight: 1.8 }}
        />
      </main>
    </div>
  );
}
