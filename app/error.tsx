"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development; replace with Sentry/similar in production
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-brand-bg">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-brand-text">
            Qualcosa è andato storto
          </h1>
          <p className="text-sm text-brand-text-muted">
            Si è verificato un errore imprevisto. Riprova o contatta il supporto
            se il problema persiste.
          </p>
          {error.digest && (
            <p className="text-xs text-brand-text-faint font-mono">
              Codice errore: {error.digest}
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors">
            Riprova
          </button>
          <a
            href="/"
            className="px-5 py-2 rounded-full text-sm font-semibold border border-brand-border text-brand-text hover:bg-brand-surface transition-colors">
            Torna alla home
          </a>
        </div>
      </div>
    </div>
  );
}
