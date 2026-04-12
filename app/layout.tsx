import { DynamicWrapper } from "@/components/dynamic-wrapper";
import { JsonLdScript } from "@/components/json-ld-script";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getActiveSnippets } from "@/lib/db/snippets-queries";
import type { SiteSnippet, SnippetType } from "@/lib/db/schema";
import type { Viewport } from "next";
import { Manrope } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ["latin"] });

// ---------------------------------------------------------------------------
// Snippet HEAD — tag nativi, NON next/script, NON Suspense.
//
// RootLayout è async: recupera gli snippet prima del render e li passa
// come prop a HeadSnippets. In questo modo non c'è Suspense nell'<head>
// e Next.js non streama i tag in un <template> placeholder — finiscono
// direttamente nell'<head> statico del primo byte HTML.
// ---------------------------------------------------------------------------

function HeadSnippetTag({ s }: { s: SiteSnippet }) {
  const t = s.type as SnippetType;
  switch (t) {
    case "link_css":
      return <link rel="stylesheet" href={s.content} />;
    case "style":
      // eslint-disable-next-line react/no-danger
      return <style dangerouslySetInnerHTML={{ __html: s.content }} />;
    case "script_src":
      // eslint-disable-next-line react/no-danger
      return <script src={s.content} async />;
    case "script":
      return (
        // eslint-disable-next-line react/no-danger
        <script
          id={`snippet-head-${s.id}`}
          dangerouslySetInnerHTML={{ __html: s.content }}
        />
      );
    case "raw":
    default:
      // raw non è valido nell'<head> — ignorato
      return null;
  }
}

function HeadSnippets({ snippets }: { snippets: SiteSnippet[] }) {
  return (
    <>
      {snippets.map((s) => (
        <HeadSnippetTag key={s.id} s={s} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Snippet BODY END — next/script afterInteractive va bene qui.
// ---------------------------------------------------------------------------

function BodySnippetTag({ s }: { s: SiteSnippet }) {
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

function BodyEndSnippets({ snippets }: { snippets: SiteSnippet[] }) {
  return (
    <>
      {snippets.map((s) => (
        <BodySnippetTag key={s.id} s={s} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Maintenance overlay
// ---------------------------------------------------------------------------

async function MaintenanceOverlay() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";

  const skipOverlay =
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (skipOverlay) return null;

  const settings = await getAppSettings();
  if (settings.maintenance_mode !== "true") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          padding: "2.5rem 2rem",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔧</div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#111",
            marginBottom: "0.5rem",
          }}>
          Sito in manutenzione
        </h2>
        <p style={{ fontSize: "0.95rem", color: "#555", lineHeight: 1.6 }}>
          Stiamo lavorando per migliorare la tua esperienza.
          <br />
          Torna a trovarci a breve.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root layout — async per risolvere gli snippet prima del render
// ---------------------------------------------------------------------------

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch unico: suddividiamo per position dopo
  const allSnippets = await getActiveSnippets();
  const headSnippets = allSnippets.filter((s) => s.position === "head");
  const bodySnippets = allSnippets.filter((s) => s.position === "body_end");

  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}>
      <head>
        {/*
         * JsonLdScript rimane in Suspense: è opzionale e non urgente.
         * HeadSnippets NON usa Suspense: i dati sono già risolti sopra,
         * così i tag entrano nell'<head> statico del primo byte HTML.
         */}
        <Suspense fallback={null}>
          <JsonLdScript />
        </Suspense>
        <HeadSnippets snippets={headSnippets} />
      </head>
      <body className="min-h-[100dvh] bg-gray-50">
        <Suspense>
          <DynamicWrapper>{children}</DynamicWrapper>
          <MaintenanceOverlay />
        </Suspense>
        {/* Snippet position="body_end" — afterInteractive, va bene nel body */}
        <BodyEndSnippets snippets={bodySnippets} />
      </body>
    </html>
  );
}
