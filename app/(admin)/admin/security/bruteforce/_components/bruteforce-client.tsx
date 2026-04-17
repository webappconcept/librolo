"use client";

import { useTransition, useState } from "react";
import {
  actionUnblockIp,
  actionBlacklistIp,
  actionRemoveFromBlacklist,
  actionUpdateBruteforceConfig,
} from "../actions";
import type { BruteforceEntry } from "@/lib/auth/rate-limit";
import type { InferSelectModel } from "drizzle-orm";
import type { ipBlacklist } from "@/lib/db/schema";

type BlacklistRow = InferSelectModel<typeof ipBlacklist>;

type Config = {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
  alertThreshold: number;
};

type Props = {
  offenders: BruteforceEntry[];
  blacklist: BlacklistRow[];
  config: Config;
};

function Badge({ blocked }: { blocked: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        blocked
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      }`}
    >
      {blocked ? "Blacklistato" : "Sospetto"}
    </span>
  );
}

export function BruteforceClient({ offenders, blacklist, config }: Props) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"offenders" | "blacklist" | "config">("offenders");
  const [configValues, setConfigValues] = useState(config);
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleUnblock(ip: string) {
    const fd = new FormData();
    fd.set("ip", ip);
    startTransition(async () => {
      const res = await actionUnblockIp(fd);
      if (res.ok) showFeedback(`IP ${ip} sbloccato`);
    });
  }

  function handleBlacklist(ip: string) {
    const reason = window.prompt(`Motivo blacklist per ${ip} (opzionale):`) ?? undefined;
    const fd = new FormData();
    fd.set("ip", ip);
    if (reason) fd.set("reason", reason);
    startTransition(async () => {
      const res = await actionBlacklistIp(fd);
      if (res.ok) showFeedback(`IP ${ip} aggiunto alla blacklist`);
    });
  }

  function handleRemoveBlacklist(ip: string) {
    const fd = new FormData();
    fd.set("ip", ip);
    startTransition(async () => {
      const res = await actionRemoveFromBlacklist(fd);
      if (res.ok) showFeedback(`IP ${ip} rimosso dalla blacklist`);
    });
  }

  function handleConfigSave() {
    const fd = new FormData();
    fd.set("bf_max_attempts", String(configValues.maxAttempts));
    fd.set("bf_window_minutes", String(configValues.windowMinutes));
    fd.set("bf_lockout_minutes", String(configValues.lockoutMinutes));
    fd.set("bf_alert_threshold", String(configValues.alertThreshold));
    startTransition(async () => {
      const res = await actionUpdateBruteforceConfig(fd);
      if (res.ok) showFeedback("Configurazione salvata");
      else showFeedback("Errore: " + res.error);
    });
  }

  const tabs = [
    { key: "offenders" as const, label: `Tentativi (${offenders.length})` },
    { key: "blacklist" as const, label: `Blacklist (${blacklist.length})` },
    { key: "config" as const, label: "Configurazione" },
  ];

  return (
    <div className="space-y-6">
      {/* Feedback toast */}
      {feedback && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {feedback}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "IP sospetti (24h)", value: offenders.length },
          { label: "IP blacklistati", value: blacklist.length },
          { label: "Max tentativi", value: configValues.maxAttempts },
          { label: "Finestra (min)", value: configValues.windowMinutes },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Tentativi */}
      {tab === "offenders" && (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-offset)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                {["IP", "Email", "Tentativi (24h)", "Ultimo", "Stato", "Azioni"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-divider)]">
              {offenders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    Nessun IP sospetto nelle ultime 24h
                  </td>
                </tr>
              )}
              {offenders.map((o) => (
                <tr key={`${o.ip}-${o.email}`} className="hover:bg-[var(--color-surface-offset)]">
                  <td className="px-4 py-3 font-mono text-xs">{o.ip}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{o.email}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{o.attempts}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] tabular-nums">
                    {new Date(o.lastAttempt).toLocaleString("it-IT")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge blocked={o.isBlacklisted} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {!o.isBlacklisted && (
                        <>
                          <button
                            disabled={pending}
                            onClick={() => handleUnblock(o.ip)}
                            className="rounded px-2 py-1 text-xs border border-[var(--color-border)] hover:bg-[var(--color-surface-dynamic)] disabled:opacity-50"
                          >
                            Sblocca
                          </button>
                          <button
                            disabled={pending}
                            onClick={() => handleBlacklist(o.ip)}
                            className="rounded px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 disabled:opacity-50"
                          >
                            Blacklist
                          </button>
                        </>
                      )}
                      {o.isBlacklisted && (
                        <button
                          disabled={pending}
                          onClick={() => handleRemoveBlacklist(o.ip)}
                          className="rounded px-2 py-1 text-xs border border-[var(--color-border)] hover:bg-[var(--color-surface-dynamic)] disabled:opacity-50"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Blacklist */}
      {tab === "blacklist" && (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-offset)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                {["IP", "Motivo", "Aggiunto il", "Azioni"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-divider)]">
              {blacklist.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    Nessun IP in blacklist
                  </td>
                </tr>
              )}
              {blacklist.map((b) => (
                <tr key={b.ip} className="hover:bg-[var(--color-surface-offset)]">
                  <td className="px-4 py-3 font-mono text-xs">{b.ip}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{b.reason ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                    {new Date(b.createdAt).toLocaleString("it-IT")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={pending}
                      onClick={() => handleRemoveBlacklist(b.ip)}
                      className="rounded px-2 py-1 text-xs border border-[var(--color-border)] hover:bg-[var(--color-surface-dynamic)] disabled:opacity-50"
                    >
                      Rimuovi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Configurazione */}
      {tab === "config" && (
        <div className="max-w-lg space-y-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="text-sm font-semibold">Soglie protezione bruteforce</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Le modifiche si applicano immediatamente ai nuovi tentativi di login.
          </p>

          {([
            {
              key: "maxAttempts" as const,
              label: "Tentativi massimi",
              desc: "Numero di tentativi falliti prima del blocco",
              min: 1, max: 100,
            },
            {
              key: "windowMinutes" as const,
              label: "Finestra (minuti)",
              desc: "Intervallo di tempo in cui vengono contati i tentativi",
              min: 1, max: 1440,
            },
            {
              key: "lockoutMinutes" as const,
              label: "Durata blocco (minuti)",
              desc: "Per quanto tempo rimane bloccato l'IP dopo aver superato il limite",
              min: 1, max: 10080,
            },
            {
              key: "alertThreshold" as const,
              label: "Soglia alert email",
              desc: "Numero tentativi totali (24h) per ricevere un alert via Resend",
              min: 1, max: 1000,
            },
          ] as const).map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-1">
                {field.label}
              </label>
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={configValues[field.key]}
                onChange={(e) =>
                  setConfigValues((prev) => ({
                    ...prev,
                    [field.key]: parseInt(e.target.value, 10) || prev[field.key],
                  }))
                }
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{field.desc}</p>
            </div>
          ))}

          <button
            disabled={pending}
            onClick={handleConfigSave}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {pending ? "Salvataggio…" : "Salva configurazione"}
          </button>
        </div>
      )}
    </div>
  );
}
