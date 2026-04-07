import { DynamicWrapper } from "@/components/dynamic-wrapper";
import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js SaaS Starter",
  description: "Get started quickly with Next.js, Postgres, and Stripe.",
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ["latin"] });

async function MaintenanceOverlay() {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}>
      <body className="min-h-[100dvh] bg-gray-50">
        <Suspense>
          <DynamicWrapper>{children}</DynamicWrapper>
          <MaintenanceOverlay />
        </Suspense>
      </body>
    </html>
  );
}
