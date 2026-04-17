// app/(admin)/admin/security/bruteforce/_components/bruteforce-client.tsx
// TODO: implementare tabella tentativi, sblocco manuale e configurazione soglie
"use client";

import { ShieldBan } from "lucide-react";

export function BruteforceClient() {
  return (
    <div
      className="rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-border)",
        minHeight: "240px",
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
        style={{
          background: "color-mix(in srgb, var(--admin-accent) 10%, var(--admin-card-bg))",
          border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
        }}
      >
        <ShieldBan size={22} style={{ color: "var(--admin-accent)" }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
        Gestione Bruteforce
      </p>
      <p className="text-sm max-w-sm" style={{ color: "var(--admin-text-faint)" }}>
        Qui comparirà la tabella dei tentativi bloccati, lo sblocco manuale degli IP
        e la configurazione delle soglie (maxAttempts, windowMinutes, lockoutMinutes).
      </p>
    </div>
  );
}
