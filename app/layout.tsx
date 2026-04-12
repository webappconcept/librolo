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
// Snippet injection
// NOTA: next/script strategy="beforeInteractive" funziona SOLO nel root
// layout. In layout figli Next.js non può hoist il tag nel <head> reale.
// ---------------------------------------------------------------------------

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
      // raw non può andare nell'<head> via JSX — viene ignorato silenziosamente
      return null;
  }
}

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

async function SnippetsHead() {
  const snippets = await getActiveSnippets();
  const headSnippets = snippets.filter((s) => s.position === "head");
  return <>{headSnippets.map((s) => <HeadSnippet key={s.id} s={s} />)}</>;
}

async function SnippetsBodyEnd() {
  const snippets = await getActiveSnippets();
  const bodySnippets = snippets.filter((s) => s.position === "body_end");
  return <>{bodySnippets.map((s) => <BodySnippet key={s.id} s={s} />)}</>;
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
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}>
      <head>
        <Suspense fallback={null}>
          <JsonLdScript />
        </Suspense>
        {/* Snippet position="head" — beforeInteractive, nel <head> reale */}
        <Suspense fallback={null}>
          <SnippetsHead />
        </Suspense>
      </head>
      <body className="min-h-[100dvh] bg-gray-50">
        <Suspense>
          <DynamicWrapper>{children}</DynamicWrapper>
          <MaintenanceOverlay />
        </Suspense>
        {/* Snippet position="body_end" — afterInteractive, prima di </body> */}
        <Suspense fallback={null}>
          <SnippetsBodyEnd />
        </Suspense>
      </body>
    </html>
  );
}
