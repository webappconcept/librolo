// app/(protected)/page.tsx
"use client";

import LandingPage from "@/components/landing-page";
import type { User } from "@/lib/db/schema";
import { fullName } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const { data: user, isLoading } = useSWR<User>("/api/user", fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });

  if (isLoading) return null;
  if (!user) return <LandingPage />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-[var(--brand-text)] mb-1">
        Ciao, {fullName(user)} 👋
      </h1>
      <p className="text-sm text-[var(--brand-text-muted)] mb-8">
        Ecco cosa sta succedendo nella tua rete di lettori.
      </p>

      {/* Feed placeholder */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[var(--brand-bg)] animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-[var(--brand-bg)] animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-[var(--brand-bg)] animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-[var(--brand-bg)] animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-[var(--brand-bg)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
