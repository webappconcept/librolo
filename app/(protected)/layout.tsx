import AppNav from "@/components/app-nav";
import { PageShowRevalidator } from "@/components/pageshow-revalidator";
import { Suspense } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--brand-bg)]">
      <PageShowRevalidator />
      <Suspense fallback={null}>
        <AppNav />
      </Suspense>
      <main className="pt-16 pb-20 md:pb-0">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
