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
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 9999,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 500,
        background: blocked
          ? "color-mix(in srgb, #ef4444 15%, var(--admin-card-bg))"
          : "color-mix(in srgb, #f59e0b 15%, var(--admin-card-bg))",
        color: blocked ? "#ef4444" : "#d97706",
        border: `1px solid ${blocked ? "#fca5a5" : "#fcd34d"}`,
      }}
    >
      {blocked ? "Blacklistato" : "Sospetto"}
    </span>
  );
}

const btnBase: React.CSSProperties = {
  borderRadius: 6,
  padding: "3px 10px",
  fontSize: 12,
  cursor: "pointer",
  border: "1px solid var(--admin-border)",
  background: "var(--admin-card-bg)",
  color: "var(--admin-text)",
  transition: "opacity 0.15s",
};

const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: "color-mix(in srgb, #ef4444 12%, var(--admin-card-bg))",
  color: "#ef4444",
  border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
};

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
      else showFeedback("Errore: " + (res as { ok: false; error: string }).error);
    });
  }

  const tabs = [
    { key: "offenders" as const, label: `Tentativi (${offenders.length})` },
    { key: "blacklist" as const, label: `Blacklist (${blacklist.length})` },
    { key: "config" as const, label: "Configurazione" },
  ];

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--admin-text-faint)",
    background: "var(--admin-sidebar-bg)",
    borderBottom: "1px solid var(--admin-border)",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderBottom: "1px solid var(--admin-border)",
    color: "var(--admin-text)",
    fontSize: 13,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {feedback && (
        <div style={{
          borderRadius: 8,
          background: "color-mix(in srgb, #22c55e 12%, var(--admin-card-bg))",
          border: "1px solid color-mix(in srgb, #22c55e 30%, transparent)",
          padding: "10px 14px",
          fontSize: 13,
          color: "#16a34a",
        }}>
          {feedback}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "IP sospetti (24h)", value: offenders.length },
          { label: "IP blacklistati", value: blacklist.length },
          { label: "Max tentativi", value: configValues.maxAttempts },
          { label: "Finestra (min)", value: configValues.windowMinutes },
        ].map((s) => (
          <div key={s.label} style={{
            borderRadius: 10,
            border: "1px solid var(--admin-border)",
            background: "var(--admin-card-bg)",
            padding: "12px 16px",
          }}>
            <p style={{ fontSize: 11, color: "var(--admin-text-faint)", marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--admin-text)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ borderBottom: "1px solid var(--admin-border)", display: "flex", gap: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              paddingBottom: 10,
              fontSize: 13,
              fontWeight: 500,
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--admin-accent)" : "2px solid transparent",
              color: tab === t.key ? "var(--admin-accent)" : "var(--admin-text-faint)",
              cursor: "pointer",
              transition: "color 0.15s",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "offenders" && (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--admin-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["IP", "Email", "Tentativi (24h)", "Ultimo", "Stato", "Azioni"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offenders.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: 32, color: "var(--admin-text-faint)" }}>
                    Nessun IP sospetto nelle ultime 24h
                  </td>
                </tr>
              )}
              {offenders.map((o) => (
                <tr key={`${o.ip}-${o.email}`}>
                  <td style={tdStyle}><code style={{ fontSize: 11 }}>{o.ip}</code></td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.email}</td>
                  <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{o.attempts}</td>
                  <td style={{ ...tdStyle, color: "var(--admin-text-faint)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {new Date(o.lastAttempt).toLocaleString("it-IT")}
                  </td>
                  <td style={tdStyle}><Badge blocked={o.isBlacklisted} /></td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!o.isBlacklisted && (
                        <>
                          <button disabled={pending} onClick={() => handleUnblock(o.ip)} style={{ ...btnBase, opacity: pending ? 0.5 : 1 }}>Sblocca</button>
                          <button disabled={pending} onClick={() => handleBlacklist(o.ip)} style={{ ...btnDanger, opacity: pending ? 0.5 : 1 }}>Blacklist</button>
                        </>
                      )}
                      {o.isBlacklisted && (
                        <button disabled={pending} onClick={() => handleRemoveBlacklist(o.ip)} style={{ ...btnBase, opacity: pending ? 0.5 : 1 }}>Rimuovi</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "blacklist" && (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--admin-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["IP", "Motivo", "Aggiunto il", "Azioni"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blacklist.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: "center", padding: 32, color: "var(--admin-text-faint)" }}>
                    Nessun IP in blacklist
                  </td>
                </tr>
              )}
              {blacklist.map((b) => (
                <tr key={b.ip}>
                  <td style={tdStyle}><code style={{ fontSize: 11 }}>{b.ip}</code></td>
                  <td style={{ ...tdStyle, color: "var(--admin-text-faint)" }}>{b.reason ?? "—"}</td>
                  <td style={{ ...tdStyle, color: "var(--admin-text-faint)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {new Date(b.createdAt).toLocaleString("it-IT")}
                  </td>
                  <td style={tdStyle}>
                    <button disabled={pending} onClick={() => handleRemoveBlacklist(b.ip)} style={{ ...btnBase, opacity: pending ? 0.5 : 1 }}>Rimuovi</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "config" && (
        <div style={{
          maxWidth: 480,
          borderRadius: 10,
          border: "1px solid var(--admin-border)",
          background: "var(--admin-card-bg)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--admin-text)", marginBottom: 4 }}>Soglie protezione bruteforce</h3>
            <p style={{ fontSize: 12, color: "var(--admin-text-faint)" }}>Le modifiche si applicano immediatamente ai nuovi tentativi di login.</p>
          </div>

          {([
            { key: "maxAttempts" as const, label: "Tentativi massimi", desc: "Tentativi falliti prima del blocco", min: 1, max: 100 },
            { key: "windowMinutes" as const, label: "Finestra (minuti)", desc: "Intervallo in cui vengono contati i tentativi", min: 1, max: 1440 },
            { key: "lockoutMinutes" as const, label: "Durata blocco (minuti)", desc: "Per quanto tempo rimane bloccato l'IP", min: 1, max: 10080 },
            { key: "alertThreshold" as const, label: "Soglia alert email", desc: "Tentativi totali (24h) per ricevere un alert via Resend", min: 1, max: 1000 },
          ] as const).map((field) => (
            <div key={field.key}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text)", marginBottom: 4 }}>
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
                style={{
                  width: "100%",
                  borderRadius: 6,
                  border: "1px solid var(--admin-border)",
                  background: "var(--admin-bg)",
                  color: "var(--admin-text)",
                  padding: "7px 10px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <p style={{ marginTop: 3, fontSize: 11, color: "var(--admin-text-faint)" }}>{field.desc}</p>
            </div>
          ))}

          <button
            disabled={pending}
            onClick={handleConfigSave}
            style={{
              borderRadius: 7,
              background: "var(--admin-accent)",
              color: "#fff",
              border: "none",
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 500,
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
              alignSelf: "flex-start",
              transition: "opacity 0.15s",
            }}
          >
            {pending ? "Salvataggio…" : "Salva configurazione"}
          </button>
        </div>
      )}
    </div>
  );
}
