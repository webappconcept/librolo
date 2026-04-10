"use client";

import { useState } from "react";
import type { TemplateProps } from "./types";
import { styleConfigToCssVars } from "./types";

/**
 * Layout FAQ — accordion generato dal contenuto.
 * Il contenuto Tiptap viene parsato cercando pattern H2/H3 + paragrafo:
 * ogni H2 o H3 diventa la domanda, il paragrafo successivo la risposta.
 *
 * Campi custom usati:
 *   - intro (textarea) — testo introduttivo sopra l'accordion
 */

function parseHtmlToFaqs(html: string): { question: string; answer: string }[] {
  // Parser lato client tramite DOMParser
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const faqs: { question: string; answer: string }[] = [];
  const elements = Array.from(doc.body.children);

  let i = 0;
  while (i < elements.length) {
    const el = elements[i];
    if (el.tagName === "H2" || el.tagName === "H3") {
      const question = el.textContent?.trim() ?? "";
      let answer = "";
      let j = i + 1;
      while (j < elements.length && elements[j].tagName !== "H2" && elements[j].tagName !== "H3") {
        answer += (elements[j] as HTMLElement).innerHTML;
        j++;
      }
      if (question) faqs.push({ question, answer });
      i = j;
    } else {
      i++;
    }
  }
  return faqs;
}

export function TemplateFaq({ page, fields, styleConfig, isPreview }: TemplateProps) {
  const cssVars = styleConfigToCssVars(styleConfig);
  const primary = styleConfig.colorPrimary ?? "#0ea5e9";
  const faqs = parseHtmlToFaqs(page.content);
  const [open, setOpen] = useState<number | null>(null);

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

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "4rem 1.5rem" }}>
        <h1
          style={{
            fontFamily: styleConfig.fontDisplay ?? styleConfig.fontBody ?? "inherit",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 700,
            marginBottom: fields.intro ? "1rem" : "2.5rem",
          }}
        >
          {page.title}
        </h1>

        {fields.intro && (
          <p
            style={{
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              color: "#6b7280",
              marginBottom: "2.5rem",
            }}
          >
            {fields.intro}
          </p>
        )}

        {faqs.length === 0 ? (
          <div
            className="tpl-content"
            dangerouslySetInnerHTML={{ __html: page.content }}
            style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  border: `1px solid ${open === idx ? primary + "44" : "#e5e7eb"}`,
                  borderRadius: "0.625rem",
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(open === idx ? null : idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem 1.25rem",
                    background: open === idx ? `${primary}0a` : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: open === idx ? primary : "inherit",
                    gap: "1rem",
                  }}
                >
                  <span>{faq.question}</span>
                  <span
                    style={{
                      flexShrink: 0,
                      transition: "transform 0.2s",
                      transform: open === idx ? "rotate(180deg)" : "rotate(0deg)",
                      color: primary,
                    }}
                  >
                    ▾
                  </span>
                </button>
                {open === idx && (
                  <div
                    style={{
                      padding: "0 1.25rem 1rem",
                      fontSize: "0.9375rem",
                      lineHeight: 1.7,
                      color: "#374151",
                      borderTop: `1px solid ${primary}22`,
                    }}
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
