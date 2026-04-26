// app/(admin)/admin/tests/_components/tests-dashboard.tsx
"use client";
import { FlaskConical, Database, Zap, Mail, CheckCircle2, XCircle, AlertCircle, HelpCircle, Clock, RefreshCw } from "lucide-react";
import type { HealthChecks, HealthStatus, ServiceHealth } from "../actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

// ─── Catalogo test Vitest ─────────────────────────────────────────────────────
// Registro statico — aggiornare quando si aggiungono/rimuovono suite.
const TEST_SUITES = [
  {
    area: "Auth",
    file: "tests/app/signup-action-e2e.test.ts",
    tests: [
      "Happy path — completa registrazione e redirect",
      "Happy path — hashPassword con la password fornita",
      "Happy path — email al Bloom filter dopo insert",
      "Happy path — username al Bloom filter dopo insert",
      "Happy path — invia email verifica con OTP e firstName",
      "Happy path — cookie pending_verification_user_id",
      "Happy path — accetta acceptMarketing=on",
      "Registrazioni disabilitate — errore se registrations_enabled=false",
      "Rate limiting — blocca se checkSignupRateLimit è blocked",
      "Blacklist — blocca IP",
      "Blacklist — blocca dominio email",
      "Blacklist — blocca username",
      "Bloom filter — errore se email già registrata",
      "Bloom filter — errore se username già in uso",
      "Race condition — unique constraint users → recordSignupAttempt",
      "Race condition — unique constraint userProfiles → elimina orfano",
      "Email fallback — flusso non interrotto se Resend fallisce",
      "Validazione — rifiuta firstName vuoto",
      "Validazione — rifiuta password mismatch",
      "Validazione — rifiuta acceptTerms non spuntato",
      "Validazione — rifiuta email malformata",
      "Validazione — rifiuta username con caratteri non ammessi",
    ],
  },
  {
    area: "RBAC",
    file: "tests/lib/rbac.test.ts",
    tests: [
      "can() — admin ha admin:access",
      "can() — member non ha admin:access",
      "can() — permesso ghost restituisce false",
      "getUserPermissions() — restituisce Set non vuoto per admin",
    ],
  },
  {
    area: "SEO",
    file: "tests/lib/seo.test.ts",
    tests: [
      "getAllSeoPages — restituisce array",
      "upsertSeoPage + deleteSeoPage — ciclo reversibile",
      "robots constraint — valore persistito correttamente",
      "jsonLd toggle — abilitazione e tipo persistiti",
    ],
  },
  {
    area: "Contenuti",
    file: "tests/lib/pages.test.ts",
    tests: [
      "getAllPages — restituisce array",
      "getPageBySlug — slug inesistente → undefined",
      "togglePageStatus — ciclo reversibile",
      "deletePageCascade — elimina parent e child",
    ],
  },
  {
    area: "Template",
    file: "tests/lib/templates.test.ts",
    tests: [
      "renderTemplate — variabili sostituite correttamente",
      "renderTemplate — variabile mancante → stringa vuota",
    ],
  },
] as const;

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function statusIcon(status: HealthStatus) {
  switch (status) {
    case "ok":       return <CheckCircle2 size={16} style={{ color: "var(--admin-success, #4ade80)" }} />;
    case "degraded": return <AlertCircle  size={16} style={{ color: "var(--admin-warning, #fb923c)" }} />;
    case "error":    return <XCircle      size={16} style={{ color: "var(--admin-danger, #f87171)" }} />;
    default:         return <HelpCircle   size={16} style={{ color: "var(--admin-text-faint)" }} />;
  }
}

function statusLabel(status: HealthStatus) {
  switch (status) {
    case "ok":       return "Operativo";
    case "degraded": return "Degradato";
    case "error":    return "Errore";
    default:         return "Sconosciuto";
  }
}

function statusBg(status: HealthStatus): string {
  switch (status) {
    case "ok":       return "color-mix(in srgb, #4ade80 10%, var(--admin-card-bg))";
    case "degraded": return "color-mix(in srgb, #fb923c 10%, var(--admin-card-bg))";
    case "error":    return "color-mix(in srgb, #f87171 10%, var(--admin-card-bg))";
    default:         return "var(--admin-card-bg)";
  }
}

function statusBorder(status: HealthStatus): string {
  switch (status) {
    case "ok":       return "color-mix(in srgb, #4ade80 25%, transparent)";
    case "degraded": return "color-mix(in srgb, #fb923c 25%, transparent)";
    case "error":    return "color-mix(in srgb, #f87171 25%, transparent)";
    default:         return "var(--admin-border)";
  }
}

function serviceIcon(name: string) {
  if (name.toLowerCase().includes("redis")) return <Zap size={16} style={{ color: "var(--admin-accent)" }} />;
  if (name.toLowerCase().includes("resend")) return <Mail size={16} style={{ color: "var(--admin-accent)" }} />;
  return <Database size={16} style={{ color: "var(--admin-accent)" }} />;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Card singolo servizio ────────────────────────────────────────────────────
function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div
      style={{
        background: statusBg(service.status),
        border: `1px solid ${statusBorder(service.status)}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {serviceIcon(service.name)}
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--admin-text)" }}>
            {service.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {statusIcon(service.status)}
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--admin-text-muted)" }}>
            {statusLabel(service.status)}
          </span>
        </div>
      </div>

      {/* Latency */}
      {service.latencyMs !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={12} style={{ color: "var(--admin-text-faint)" }} />
          <span style={{ fontSize: 12, color: "var(--admin-text-faint)", fontVariantNumeric: "tabular-nums" }}>
            {service.latencyMs} ms
          </span>
        </div>
      )}

      {/* Detail / error */}
      {service.detail && (
        <p
          style={{
            fontSize: 11,
            color: service.status === "error" ? "var(--admin-danger, #f87171)" : "var(--admin-text-muted)",
            margin: 0,
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          {service.detail}
        </p>
      )}
    </div>
  );
}

// ─── Suite Vitest ─────────────────────────────────────────────────────────────
function SuiteRow({ suite }: { suite: typeof TEST_SUITES[number] }) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--admin-border)",
        paddingBottom: 16,
        marginBottom: 16,
      }}
    >
      {/* Area header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--admin-accent)",
              background: "color-mix(in srgb, var(--admin-accent) 10%, var(--admin-card-bg))",
              border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
              borderRadius: 6,
              padding: "2px 8px",
            }}
          >
            {suite.area}
          </span>
          <span style={{ fontSize: 11, color: "var(--admin-text-faint)", fontFamily: "monospace" }}>
            {suite.file}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--admin-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {suite.tests.length} test
        </span>
      </div>

      {/* Test list */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {suite.tests.map((name) => (
          <li
            key={name}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <CheckCircle2
              size={13}
              style={{ color: "var(--admin-success, #4ade80)", flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: "var(--admin-text-muted)" }}>{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export function TestsDashboard({ health }: { health: HealthChecks }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const totalTests = TEST_SUITES.reduce((acc, s) => acc + s.tests.length, 0);
  const services: ServiceHealth[] = [health.supabase, health.redis, health.resend];
  const allOk = services.every((s) => s.status === "ok");
  const hasError = services.some((s) => s.status === "error");

  const globalStatus: HealthStatus = hasError ? "error" : allOk ? "ok" : "degraded";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
              border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
              flexShrink: 0,
            }}
          >
            <FlaskConical size={18} style={{ color: "var(--admin-accent)" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--admin-text)", margin: 0 }}>
              Test &amp; Stato sistema
            </h2>
            <p style={{ fontSize: 13, color: "var(--admin-text-faint)", margin: "2px 0 0" }}>
              {fmt(health.checkedAt)}
            </p>
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={() => startTransition(() => router.refresh())}
          disabled={isPending}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 500,
            color: "var(--admin-accent)",
            background: "color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
            borderRadius: 8, padding: "6px 14px",
            cursor: isPending ? "default" : "pointer",
            opacity: isPending ? 0.6 : 1,
            transition: "opacity 150ms",
            flexShrink: 0,
          }}
        >
          <RefreshCw
            size={13}
            style={{
              transition: "transform 600ms",
              transform: isPending ? "rotate(360deg)" : "rotate(0deg)",
            }}
          />
          Aggiorna
        </button>
      </div>

      {/* ── Banner stato globale ── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
          borderRadius: 10,
          background: statusBg(globalStatus),
          border: `1px solid ${statusBorder(globalStatus)}`,
        }}
      >
        {statusIcon(globalStatus)}
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--admin-text)" }}>
          {globalStatus === "ok"
            ? "Tutti i servizi operativi"
            : globalStatus === "error"
            ? "Uno o più servizi in errore"
            : "Prestazioni degradate su almeno un servizio"}
        </span>
      </div>

      {/* ── Health checks ── */}
      <section>
        <h3
          style={{
            fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--admin-text-faint)",
            margin: "0 0 12px",
          }}
        >
          Infrastruttura
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
            gap: 12,
          }}
        >
          {services.map((s) => <ServiceCard key={s.name} service={s} />)}
        </div>
      </section>

      {/* ── Riepilogo test Vitest ── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--admin-text-faint)",
              margin: 0,
            }}
          >
            Suite Vitest
          </h3>
          <span
            style={{
              fontSize: 12, fontWeight: 500,
              color: "var(--admin-text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {totalTests} test totali · {TEST_SUITES.length} suite
          </span>
        </div>

        <div
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-border)",
            borderRadius: 12,
            padding: "20px 24px",
          }}
        >
          {TEST_SUITES.map((suite, i) => (
            <SuiteRow
              key={suite.area}
              suite={suite}
            />
          ))}
          {/* Footer note */}
          <p style={{ fontSize: 11, color: "var(--admin-text-faint)", margin: 0, lineHeight: 1.6 }}>
            I test vengono eseguiti automaticamente dalla pipeline CI ad ogni commit su <code style={{ fontFamily: "monospace", fontSize: 11 }}>main</code>.
            Il branch è protetto — il merge è consentito solo se tutti i test passano.
          </p>
        </div>
      </section>
    </div>
  );
}
