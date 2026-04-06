"use client";

import AppNav from "@/components/app-nav";
import { Suspense, useEffect } from "react";
import { mutate } from "swr";

export default function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        mutate("/api/user");
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--brand-bg)]">
      <Suspense fallback={null}>
        <AppNav />
      </Suspense>
      <main className="pt-16 pb-20 md:pb-0">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
