// app/(protected)/layout.tsx
import AppNav from "@/components/app-nav";
import { Suspense } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--brand-bg)]">
      <Suspense
        fallback={
          <div className="h-16 border-b border-[var(--brand-border)] bg-[var(--brand-surface)]" />
        }>
        <AppNav />
      </Suspense>
      <main className="pt-16 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
