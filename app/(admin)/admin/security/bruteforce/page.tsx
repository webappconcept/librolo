import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { requireAdminPage } from "@/lib/rbac/guards";
import { getBruteforceData } from "./actions";
import { BruteforceClient } from "./_components/bruteforce-client";

export const metadata: Metadata = {
  title: "Protezione Bruteforce",
};

async function BruteforceContent() {
  const data = await getBruteforceData();
  return <BruteforceClient {...data} />;
}

export default async function AdminBruteforcePage() {
  await requireAdminPage();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
          }}
        >
          <ShieldAlert size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
            Protezione Bruteforce
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
            Monitora i tentativi di accesso sospetti e gestisci le regole di blocco.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-40">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
            />
          </div>
        }
      >
        <BruteforceContent />
      </Suspense>
    </div>
  );
}
