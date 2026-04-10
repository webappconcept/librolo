import type { TemplateProps } from "./types";
import { styleConfigToCssVars } from "./types";

/**
 * Layout Generico — colonna singola centrata.
 * Adatto per pagine istituzionali, about, privacy policy, ecc.
 * Campi custom usati: nessuno (usa solo il content Tiptap).
 */
export function TemplateDefault({ page, styleConfig, isPreview }: TemplateProps) {
  const cssVars = styleConfigToCssVars(styleConfig);

  return (
    <div
      style={{
        ...cssVars,
        fontFamily: styleConfig.fontBody ?? "inherit",
        background: styleConfig.colorBg ?? "var(--color-bg, #fff)",
        color: styleConfig.colorText ?? "var(--color-text, #1a1a1a)",
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

      <main
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "4rem 1.5rem",
        }}
      >
        <h1
          style={{
            fontFamily: styleConfig.fontDisplay ?? styleConfig.fontBody ?? "inherit",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "1.5rem",
            color: styleConfig.colorText ?? "inherit",
          }}
        >
          {page.title}
        </h1>

        <div
          className="tpl-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
          style={{
            fontSize: "1.0625rem",
            lineHeight: 1.75,
            color: styleConfig.colorText ?? "inherit",
          }}
        />
      </main>
    </div>
  );
}
