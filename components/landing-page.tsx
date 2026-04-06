// components/landing-page.tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-[var(--brand-text)] tracking-tight mb-4">
        📚 Librolo
      </h1>
      <p className="text-lg text-[var(--brand-text-muted)] mb-10">
        Condividi le tue letture, scopri nuovi libri,
        <br />
        connettiti con altri lettori.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/sign-up"
          className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] transition-colors">
          Inizia ora
        </Link>
        <Link
          href="/sign-in"
          className="px-6 py-2.5 rounded-full text-sm font-semibold text-[var(--brand-text)] border border-[var(--brand-border)] hover:bg-[var(--brand-bg)] transition-colors">
          Accedi
        </Link>
      </div>
    </div>
  );
}
