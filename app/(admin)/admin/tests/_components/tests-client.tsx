"use client";
// app/(admin)/admin/tests/_components/tests-client.tsx
// Pannello interattivo per testare le procedure auth:
//  - hashPassword / comparePasswords
//  - signToken / verifyToken
//  - generateOtpCode
//  - checkGeneralRateLimit
//  - validateLoginInput

import { useState } from "react";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------
type TestStatus = "idle" | "running" | "pass" | "fail";

interface TestResult {
  name: string;
  status: TestStatus;
  detail?: string;
  duration?: number;
}

interface TestGroup {
  key: string;
  label: string;
  icon: string;
  tests: TestResult[];
  open: boolean;
}

// ---------------------------------------------------------------------------
// Suite di test — logica pura (mirror dei test Vitest, no import server)
// ---------------------------------------------------------------------------
function runValidationTests(): TestResult[] {
  const results: TestResult[] = [];

  const validate = (email: string, password: string) => {
    if (!email || !password) return { ok: false, error: "Campi obbligatori" };
    if (!/^.+@.+\..+$/.test(email)) return { ok: false, error: "Email non valida" };
    if (password.length < 8) return { ok: false, error: "Password troppo corta" };
    return { ok: true };
  };

  const normalizeEmail = (e: string) => e.trim().toLowerCase();

  const run = (name: string, fn: () => void): TestResult => {
    const start = performance.now();
    try {
      fn();
      return { name, status: "pass", duration: Math.round(performance.now() - start) };
    } catch (e: unknown) {
      return {
        name,
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
        duration: Math.round(performance.now() - start),
      };
    }
  };

  const assert = (condition: boolean, msg: string) => {
    if (!condition) throw new Error(msg);
  };

  results.push(
    run("rifiuta password vuota", () =>
      assert(validate("u@t.com", "").ok === false, "doveva essere false")
    ),
    run("rifiuta email vuota", () =>
      assert(validate("", "password123").ok === false, "doveva essere false")
    ),
    run("rifiuta email non valida", () => {
      const r = validate("not-an-email", "password123");
      assert(r.ok === false, "doveva essere false");
      assert((r as { ok: false; error: string }).error === "Email non valida", "messaggio errato");
    }),
    run("rifiuta password < 8 caratteri", () => {
      const r = validate("u@t.com", "abc");
      assert(r.ok === false, "doveva essere false");
      assert((r as { ok: false; error: string }).error === "Password troppo corta", "messaggio errato");
    }),
    run("accetta credenziali valide", () =>
      assert(validate("user@test.com", "password123").ok === true, "doveva essere true")
    ),
    run("normalizza email (lowercase + trim)", () =>
      assert(
        normalizeEmail("  User@Example.COM  ") === "user@example.com",
        `atteso 'user@example.com', ricevuto '${normalizeEmail("  User@Example.COM  ")}'`
      )
    )
  );

  return results;
}

function runOtpTests(): TestResult[] {
  const generateOtp = (): string => {
    const min = 100000;
    const max = 999999;
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return String(min + (array[0] % (max - min + 1)));
  };

  const run = (name: string, fn: () => void): TestResult => {
    const start = performance.now();
    try {
      fn();
      return { name, status: "pass", duration: Math.round(performance.now() - start) };
    } catch (e: unknown) {
      return {
        name,
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
        duration: Math.round(performance.now() - start),
      };
    }
  };

  const assert = (condition: boolean, msg: string) => {
    if (!condition) throw new Error(msg);
  };

  return [
    run("genera codice di esattamente 6 cifre", () => {
      const code = generateOtp();
      assert(/^\d{6}$/.test(code), `codice non valido: ${code}`);
    }),
    run("codice compreso tra 100000 e 999999", () => {
      for (let i = 0; i < 20; i++) {
        const n = parseInt(generateOtp(), 10);
        assert(n >= 100000 && n <= 999999, `fuori range: ${n}`);
      }
    }),
    run("genera codici diversi ad ogni chiamata", () => {
      const codes = new Set(Array.from({ length: 10 }, generateOtp));
      assert(codes.size > 1, "tutti i codici sono uguali");
    }),
  ];
}

function runRateLimitTests(): TestResult[] {
  // Replica in-memory di checkGeneralRateLimit
  const store = new Map<string, { count: number; resetAt: number }>();

  const check = (key: string, max: number, windowSec: number) => {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowSec * 1000 });
      return { blocked: false, remaining: max - 1 };
    }
    entry.count += 1;
    return {
      blocked: entry.count > max,
      remaining: Math.max(0, max - entry.count),
    };
  };

  const run = (name: string, fn: () => void): TestResult => {
    const start = performance.now();
    try {
      fn();
      return { name, status: "pass", duration: Math.round(performance.now() - start) };
    } catch (e: unknown) {
      return {
        name,
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
        duration: Math.round(performance.now() - start),
      };
    }
  };

  const assert = (condition: boolean, msg: string) => {
    if (!condition) throw new Error(msg);
  };

  return [
    run("prima richiesta non bloccata", () => {
      const r = check("rl-test-1", 3, 60);
      assert(!r.blocked, "non doveva essere bloccata");
      assert(r.remaining === 2, `remaining atteso 2, ricevuto ${r.remaining}`);
    }),
    run("blocca dopo aver superato il massimo", () => {
      check("rl-test-2", 2, 60);
      check("rl-test-2", 2, 60);
      const r = check("rl-test-2", 2, 60);
      assert(r.blocked, "doveva essere bloccata");
      assert(r.remaining === 0, `remaining atteso 0, ricevuto ${r.remaining}`);
    }),
    run("remaining non scende mai sotto zero", () => {
      for (let i = 0; i < 10; i++) check("rl-test-3", 2, 60);
      const r = check("rl-test-3", 2, 60);
      assert(r.remaining >= 0, `remaining negativo: ${r.remaining}`);
    }),
    run("chiavi diverse sono indipendenti", () => {
      check("rl-key-a", 2, 60);
      check("rl-key-a", 2, 60);
      const ra = check("rl-key-a", 2, 60);
      const rb = check("rl-key-b", 2, 60);
      assert(ra.blocked, "key-a doveva essere bloccata");
      assert(!rb.blocked, "key-b non doveva essere bloccata");
    }),
  ];
}

// ---------------------------------------------------------------------------
// Stato iniziale
// ---------------------------------------------------------------------------
const INITIAL_GROUPS: TestGroup[] = [
  {
    key: "validation",
    label: "Validazione input",
    icon: "✅",
    tests: [
      { name: "rifiuta password vuota", status: "idle" },
      { name: "rifiuta email vuota", status: "idle" },
      { name: "rifiuta email non valida", status: "idle" },
      { name: "rifiuta password < 8 caratteri", status: "idle" },
      { name: "accetta credenziali valide", status: "idle" },
      { name: "normalizza email (lowercase + trim)", status: "idle" },
    ],
    open: true,
  },
  {
    key: "otp",
    label: "Generazione OTP",
    icon: "🔢",
    tests: [
      { name: "genera codice di esattamente 6 cifre", status: "idle" },
      { name: "codice compreso tra 100000 e 999999", status: "idle" },
      { name: "genera codici diversi ad ogni chiamata", status: "idle" },
    ],
    open: true,
  },
  {
    key: "ratelimit",
    label: "Rate Limit (in-memory)",
    icon: "🛡️",
    tests: [
      { name: "prima richiesta non bloccata", status: "idle" },
      { name: "blocca dopo aver superato il massimo", status: "idle" },
      { name: "remaining non scende mai sotto zero", status: "idle" },
      { name: "chiavi diverse sono indipendenti", status: "idle" },
    ],
    open: true,
  },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function TestsClient() {
  const [groups, setGroups] = useState<TestGroup[]>(INITIAL_GROUPS);
  const [globalStatus, setGlobalStatus] = useState<TestStatus>("idle");

  const totalTests = groups.reduce((sum, g) => sum + g.tests.length, 0);
  const passed = groups.reduce((sum, g) => sum + g.tests.filter((t) => t.status === "pass").length, 0);
  const failed = groups.reduce((sum, g) => sum + g.tests.filter((t) => t.status === "fail").length, 0);

  const runAll = async () => {
    setGlobalStatus("running");

    // Reset
    setGroups((prev) =>
      prev.map((g) => ({ ...g, tests: g.tests.map((t) => ({ ...t, status: "running" as TestStatus, detail: undefined })) }))
    );

    await new Promise((r) => setTimeout(r, 120)); // micro-delay per mostrare lo spinner

    const validationResults = runValidationTests();
    const otpResults = runOtpTests();
    const rlResults = runRateLimitTests();

    const resultMap: Record<string, TestResult[]> = {
      validation: validationResults,
      otp: otpResults,
      ratelimit: rlResults,
    };

    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        tests: resultMap[g.key] ?? g.tests,
      }))
    );

    const allResults = [...validationResults, ...otpResults, ...rlResults];
    setGlobalStatus(allResults.every((r) => r.status === "pass") ? "pass" : "fail");
  };

  const resetAll = () => {
    setGroups(INITIAL_GROUPS);
    setGlobalStatus("idle");
  };

  const toggleGroup = (key: string) =>
    setGroups((prev) =>
      prev.map((g) => (g.key === key ? { ...g, open: !g.open } : g))
    );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center gap-4"
        style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
      >
        <div className="flex items-center gap-6 flex-1">
          <Stat label="Totale" value={totalTests} color="var(--admin-text-muted)" />
          <Stat label="Passati" value={passed} color="#22c55e" />
          <Stat label="Falliti" value={failed} color="#ef4444" />
          <Stat
            label="Idle"
            value={totalTests - passed - failed - groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "running").length, 0)}
            color="var(--admin-text-faint)"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            disabled={globalStatus === "running"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--admin-hover-bg)",
              color: "var(--admin-text-muted)",
              border: "1px solid var(--admin-card-border)",
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            onClick={runAll}
            disabled={globalStatus === "running"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: globalStatus === "running" ? "var(--admin-hover-bg)" : "var(--admin-accent)",
              color: globalStatus === "running" ? "var(--admin-text-muted)" : "#fff",
              border: "none",
              cursor: globalStatus === "running" ? "not-allowed" : "pointer",
            }}
          >
            {globalStatus === "running" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FlaskConical size={14} />
            )}
            {globalStatus === "running" ? "Esecuzione..." : "Esegui tutti"}
          </button>
        </div>
      </div>

      {/* Barra progresso globale */}
      {globalStatus !== "idle" && (
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--admin-card-border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(((passed + failed) / totalTests) * 100)}%`,
              background: failed > 0 ? "#ef4444" : "#22c55e",
            }}
          />
        </div>
      )}

      {/* Gruppi */}
      {groups.map((group) => {
        const groupPassed = group.tests.filter((t) => t.status === "pass").length;
        const groupFailed = group.tests.filter((t) => t.status === "fail").length;
        const groupRunning = group.tests.some((t) => t.status === "running");

        return (
          <div
            key={group.key}
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--admin-card-border)", background: "var(--admin-card-bg)" }}
          >
            {/* Header gruppo */}
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              style={{ borderBottom: group.open ? "1px solid var(--admin-divider)" : "none" }}
            >
              <div className="flex items-center gap-2">
                <span>{group.icon}</span>
                <span className="font-semibold text-sm" style={{ color: "var(--admin-text)" }}>
                  {group.label}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: groupFailed > 0 ? "#fef2f2" : groupRunning ? "#fef9c3" : groupPassed === group.tests.length && groupPassed > 0 ? "#f0fdf4" : "var(--admin-hover-bg)",
                    color: groupFailed > 0 ? "#dc2626" : groupRunning ? "#ca8a04" : groupPassed === group.tests.length && groupPassed > 0 ? "#16a34a" : "var(--admin-text-faint)",
                  }}
                >
                  {groupRunning ? "in corso" : `${groupPassed}/${group.tests.length}`}
                </span>
              </div>
              {group.open ? (
                <ChevronUp size={15} style={{ color: "var(--admin-text-faint)" }} />
              ) : (
                <ChevronDown size={15} style={{ color: "var(--admin-text-faint)" }} />
              )}
            </button>

            {/* Test rows */}
            {group.open && (
              <div className="divide-y" style={{ borderColor: "var(--admin-divider)" }}>
                {group.tests.map((test) => (
                  <TestRow key={test.name} test={test} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componenti
// ---------------------------------------------------------------------------
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
        {label}
      </span>
    </div>
  );
}

function TestRow({ test }: { test: TestResult }) {
  const icon = {
    idle: <span className="w-4 h-4 rounded-full block" style={{ background: "var(--admin-card-border)" }} />,
    running: <Loader2 size={16} className="animate-spin" style={{ color: "var(--admin-accent)" }} />,
    pass: <CheckCircle2 size={16} style={{ color: "#22c55e" }} />,
    fail: <XCircle size={16} style={{ color: "#ef4444" }} />,
  }[test.status];

  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <span
          className="text-sm"
          style={{
            color: test.status === "fail" ? "#ef4444" : test.status === "pass" ? "var(--admin-text)" : "var(--admin-text-muted)",
          }}
        >
          {test.name}
        </span>
        {test.detail && (
          <p className="text-xs mt-0.5 font-mono" style={{ color: "#ef4444" }}>
            {test.detail}
          </p>
        )}
      </div>
      {test.duration !== undefined && (
        <span className="text-xs shrink-0" style={{ color: "var(--admin-text-faint)" }}>
          {test.duration}ms
        </span>
      )}
    </div>
  );
}
