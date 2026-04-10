import type { TemplateProps } from "./types";
import { styleConfigToCssVars } from "./types";

/**
 * Layout Servizio.
 * Campi custom usati:
 *   - subtitle   (text)    — sottotitolo sezione
 *   - icon       (text)    — emoji o URL icona
 *   - price      (text)    — prezzo o range (es. "Da €500")
 *   - ctaLabel   (text)    — testo bottone CTA
 *   - ctaUrl     (url)     — link bottone CTA
 *   - sidebarTitle (text)  — titolo sidebar
 *   - sidebarText  (textarea) — testo sidebar
 */
export function TemplateService({ page, fields, styleConfig, isPreview }: TemplateProps) {
  const cssVars = styleConfigToCssVars(styleConfig);
  const primary = styleConfig.colorPrimary ?? "#0ea5e9";

  return (
    <div
      style={{
        ...cssVars,
        fontFamily: styleConfig.fontBody ?? "inherit",
        background: styleConfig.colorBg ?? "#fff",
        color: styleConfig.colorText ?? "#1a1a1a",
        minHeight: "100vh",
      }}
    >
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
          }}
        >
          ⚠️ Anteprima — non pubblicata
        </div>
      )}

      {/* Header sezione */}
      <header
        style={{
          background: `linear-gradient(135deg, ${primary}18, ${primary}08)`,
          borderBottom: `1px solid ${primary}22`,
          padding: "3rem 1.5rem 2.5rem",
          textAlign: "center",
        }}
      >
        {fields.icon && (
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{fields.icon}</div>
        )}
        <h1
          style={{
            fontFamily: styleConfig.fontDisplay ?? styleConfig.fontBody ?? "inherit",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          {page.title}
        </h1>
        {fields.subtitle && (
          <p style={{ fontSize: "1.125rem", color: "#6b7280", maxWidth: "600px", margin: "0 auto" }}>
            {fields.subtitle}
          </p>
        )}
      </header>

      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "3rem 1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "3rem",
          alignItems: "start",
        }}
      >
        {/* Contenuto principale */}
        <div
          className="tpl-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
          style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}
        />

        {/* Sidebar */}
        <aside>
          <div
            style={{
              background: `${primary}0c`,
              border: `1px solid ${primary}22`,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              position: "sticky",
              top: "2rem",
            }}
          >
            {fields.sidebarTitle && (
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: primary,
                }}
              >
                {fields.sidebarTitle}
              </h3>
            )}
            {fields.sidebarText && (
              <p style={{ fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "1.25rem", color: "#374151" }}>
                {fields.sidebarText}
              </p>
            )}
            {fields.price && (
              <p
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 700,
                  color: primary,
                  marginBottom: "1rem",
                }}
              >
                {fields.price}
              </p>
            )}
            {fields.ctaUrl && (
              <a
                href={fields.ctaUrl}
                style={{
                  display: "block",
                  background: primary,
                  color: "#fff",
                  textAlign: "center",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.5rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: "0.9375rem",
                }}
              >
                {fields.ctaLabel || "Contattaci"}
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
