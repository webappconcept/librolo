// app/(admin)/admin/permissions/_components/permissions-info-card.tsx
"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Code2,
  Info,
  Layers,
  ShieldCheck,
  User,
} from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} style={{ color: "var(--admin-accent)" }} />
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--admin-text-muted)" }}>
        {children}
      </span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
        style={{ background: "var(--admin-accent)" }}>
        {n}
      </span>
      <span
        className="text-sm leading-relaxed"
        style={{ color: "var(--admin-text-muted)" }}>
        {children}
      </span>
    </li>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono"
      style={{
        background: "var(--admin-hover-bg)",
        color: "var(--admin-text)",
        border: "1px solid var(--admin-card-border)",
      }}>
      {children}
    </code>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function PermissionsInfoCard() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--admin-card-border)",
        background: "var(--admin-card-bg)",
      }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
        style={{
          background: open ? "var(--admin-hover-bg)" : "transparent",
        }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background:
              "color-mix(in oklch, var(--admin-accent) 12%, transparent)",
          }}>
          <Info size={14} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div className="flex-1">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--admin-text)" }}>
            Come funziona il sistema dei permessi?
          </span>
          <span
            className="block text-xs"
            style={{ color: "var(--admin-text-faint)" }}>
            Guida rapida, configurazione e esempio di utilizzo nel codice
          </span>
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: "var(--admin-text-faint)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Contenuto collassabile */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? "1200px" : "0px", opacity: open ? 1 : 0 }}>
        <div
          className="px-5 pb-5 pt-1 grid gap-5"
          style={{ borderTop: "1px solid var(--admin-card-border)" }}>
          {/* Come funziona */}
          <div className="pt-4">
            <SectionTitle icon={BookOpen}>Come funziona</SectionTitle>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--admin-text-muted)" }}>
              Il sistema RBAC (Role-Based Access Control) si basa su tre livelli
              sovrapposti:
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                {
                  icon: Layers,
                  title: "Permessi",
                  desc: "Azioni atomiche dell'app. Usa il pattern risorsa:azione es. posts:publish, users:ban.",
                },
                {
                  icon: ShieldCheck,
                  title: "Ruoli",
                  desc: "Insiemi di permessi. Assegna un set di permessi a ciascun ruolo in Gestione Ruoli.",
                },
                {
                  icon: User,
                  title: "Override utente",
                  desc: "Concedi o revoca un permesso specifico a un singolo utente, anche con scadenza.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-lg p-3"
                  style={{
                    background: "var(--admin-hover-bg)",
                    border: "1px solid var(--admin-card-border)",
                  }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={13} style={{ color: "var(--admin-accent)" }} />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--admin-text)" }}>
                      {title}
                    </span>
                  </div>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: "var(--admin-text-faint)" }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Setup */}
          <div>
            <SectionTitle icon={CheckCircle2}>
              Configurazione iniziale
            </SectionTitle>
            <ol className="space-y-2.5">
              <Step n={1}>
                Vai su <strong>Catalogo permessi</strong> (tab accanto) e crea i
                permessi che ti servono. Usa nomi nel formato{" "}
                <Pill>risorsa:azione</Pill>, ad esempio{" "}
                <Pill>posts:publish</Pill>, <Pill>users:ban</Pill>,{" "}
                <Pill>admin:access</Pill>.
              </Step>
              <Step n={2}>
                Vai su <strong>Matrice ruoli</strong> e attiva/disattiva i
                toggle per assegnare i permessi ai ruoli. Ogni cella è un
                toggle: verde = permesso assegnato.
              </Step>
              <Step n={3}>
                Per eccezioni individuali, apri il dettaglio di un utente in{" "}
                <strong>Utenti</strong> → tab <strong>Accessi</strong> → sezione
                Override. Puoi concedere o revocare un permesso con scadenza
                opzionale.
              </Step>
              <Step n={4}>
                Nel codice dell'app, usa la funzione <Pill>can()</Pill> per
                verificare se l'utente corrente ha un determinato permesso (vedi
                esempio sotto).
              </Step>
            </ol>
          </div>

          {/* Convenzioni chiave */}
          <div>
            <SectionTitle icon={Layers}>Convenzioni per le chiavi</SectionTitle>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {[
                { key: "admin:access", desc: "Accesso al pannello admin" },
                { key: "users:view", desc: "Visualizza lista utenti" },
                { key: "users:ban", desc: "Banna/sbanna un utente" },
                { key: "users:delete", desc: "Elimina account utente" },
                { key: "posts:create", desc: "Crea nuovi contenuti" },
                { key: "posts:publish", desc: "Pubblica/depubblica" },
                { key: "posts:delete", desc: "Elimina contenuti altrui" },
                { key: "comments:delete", desc: "Elimina commenti" },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-2">
                  <Pill>{key}</Pill>
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--admin-text-faint)" }}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Esempio codice */}
          <div>
            <SectionTitle icon={Code2}>
              Esempio di utilizzo nel codice
            </SectionTitle>
            <div
              className="rounded-lg overflow-x-auto"
              style={{
                background: "var(--admin-hover-bg)",
                border: "1px solid var(--admin-card-border)",
              }}>
              <pre
                className="text-[12px] leading-relaxed p-4 font-mono"
                style={{ color: "var(--admin-text-muted)" }}>
                {`// In un Server Component o Server Action
import { can } from "@/lib/rbac/can";
import { getSession } from "@/lib/auth/session";

export default async function PublishButton() {
  const session = await getSession();

  // Verifica se l'utente ha il permesso
  const allowed = await can(session.user.id, "posts:publish");

  if (!allowed) {
    return <p>Non hai il permesso per pubblicare.</p>;
  }

  return <button>Pubblica</button>;
}

// Oppure in una Server Action
export async function publishPost(postId: number) {
  const session = await getSession();
  const allowed = await can(session.user.id, "posts:publish");
  if (!allowed) throw new Error("Unauthorized");

  // ... logica di pubblicazione
}`}
              </pre>
            </div>
            <p
              className="text-[12px] mt-2"
              style={{ color: "var(--admin-text-faint)" }}>
              La funzione <Pill>can(userId, key)</Pill> risolve automaticamente
              ruolo + override individuali (grant/revoke) e rispetta le
              scadenze.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
