import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { requireAdminPage } from "@/app/(admin)/admin/_lib/require-admin";
import { getBruteforceData } from "./actions";
import { BruteforceClient } from "./_components/bruteforce-client";

export const metadata = {
  title: "Protezione Bruteforce",
};

async function BruteforceContent() {
  const data = await getBruteforceData();
  return <BruteforceClient {...data} />;
}

export default async function BruteforcePage() {
  await requireAdminPage();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-highlight)]">
          <ShieldAlert className="h-5 w-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Protezione Bruteforce</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Monitora i tentativi di accesso sospetti e gestisci le regole di blocco.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-lg bg-[var(--color-surface-offset)]" />
        }
      >
        <BruteforceContent />
      </Suspense>
    </div>
  );
}
