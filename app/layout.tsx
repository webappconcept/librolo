import { DynamicWrapper } from "@/components/dynamic-wrapper";
import { getUser } from "@/lib/db/queries";
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

export default async function RootLayout({
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
        </Suspense>
      </body>
    </html>
  );
}
