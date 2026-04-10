import type { TemplateProps } from "./types";
import { styleConfigToCssVars } from "./types";

/**
 * Layout Landing Page — full-width, senza header/footer standard.
 * Campi custom usati:
 *   - heroImage   (image)    — URL immagine hero background
 *   - heroSubtitle (text)   — sottotitolo hero
 *   - ctaLabel    (text)    — testo bottone principale
 *   - ctaUrl      (url)     — link bottone principale
 *   - ctaSecondaryLabel (text) — testo bottone secondario
 *   - ctaSecondaryUrl   (url)  — link bottone secondario
 */
export function TemplateLanding({ page, fields, styleConfig, isPreview }: TemplateProps) {
  const cssVars = styleConfigToCssVars(styleConfig);
  const primary = styleConfig.colorPrimary ?? "#7c3aed";

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

      {/* Hero */}
      <section
        style={{
          position: "relative",
          minHeight: "90vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4rem 1.5rem",
          background: fields.heroImage
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${fields.heroImage}) center/cover`
            : `linear-gradient(135deg, ${primary}, ${primary}aa)`,
        }}
      >
        <div style={{ maxWidth: "760px", color: fields.heroImage ? "#fff" : "#fff" }}>
          <h1
            style={{
              fontFamily: styleConfig.fontDisplay ?? styleConfig.fontBody ?? "inherit",
              fontSize: "clamp(2.25rem, 6vw, 4rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "1.25rem",
            }}
          >
            {page.title}
          </h1>
          {fields.heroSubtitle && (
            <p
              style={{
                fontSize: "clamp(1rem, 2.5vw, 1.375rem)",
                lineHeight: 1.6,
                opacity: 0.9,
                marginBottom: "2.5rem",
              }}
            >
              {fields.heroSubtitle}
            </p>
          )}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {fields.ctaUrl && (
              <a
                href={fields.ctaUrl}
                style={{
                  background: "#fff",
                  color: primary,
                  padding: "0.875rem 2rem",
                  borderRadius: "0.5rem",
                  fontWeight: 700,
                  fontSize: "1rem",
                  textDecoration: "none",
                }}
              >
                {fields.ctaLabel || "Inizia ora"}
              </a>
            )}
            {fields.ctaSecondaryUrl && (
              <a
                href={fields.ctaSecondaryUrl}
                style={{
                  border: "2px solid rgba(255,255,255,0.7)",
                  color: "#fff",
                  padding: "0.875rem 2rem",
                  borderRadius: "0.5rem",
                  fontWeight: 600,
                  fontSize: "1rem",
                  textDecoration: "none",
                }}
              >
                {fields.ctaSecondaryLabel || "Scopri di più"}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Corpo pagina */}
      {page.content && (
        <section style={{ maxWidth: "900px", margin: "0 auto", padding: "4rem 1.5rem" }}>
          <div
            className="tpl-content"
            dangerouslySetInnerHTML={{ __html: page.content }}
            style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}
          />
        </section>
      )}
    </div>
  );
}
