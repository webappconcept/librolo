// app/(protected)/page.tsx
"use client";

import type { User } from "@/lib/db/schema";
import { fullName } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const { data: user } = useSWR<User>("/api/user", fetcher);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-brand-text mb-1">
        {user ? `Ciao, ${fullName(user)} 👋` : "Bentornato 👋"}
      </h1>
      <p className="text-sm text-brand-text-muted mb-8">
        Ecco cosa sta succedendo nella tua rete di lettori.
      </p>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-brand-border bg-brand-surface p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-brand-bg animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-brand-bg animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-brand-bg animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-brand-bg animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-brand-bg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
