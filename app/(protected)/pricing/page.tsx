// app/(protected)/pricing/page.tsx
import { Suspense } from "react";
import PricingContent from "./pricing-content";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-[var(--brand-text-muted)]">
          Caricamento prezzi...
        </div>
      }>
      <PricingContent />
    </Suspense>
  );
}
