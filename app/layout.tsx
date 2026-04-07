import { DynamicWrapper } from "@/components/dynamic-wrapper";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { headers } from "next/headers";
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
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}>
      <body className="min-h-[100dvh] bg-gray-50">
        {isAdminPath ? (
          children
        ) : (
          <Suspense>
            <DynamicWrapper>{children}</DynamicWrapper>
          </Suspense>
        )}
      </body>
    </html>
  );
}
