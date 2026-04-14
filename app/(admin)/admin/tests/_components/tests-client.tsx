"use client";
// app/(admin)/admin/tests/_components/tests-client.tsx
//
// Pannello test a tabs. Ogni tab è una categoria di test indipendente.
// Per aggiungere una categoria:
//  1. Crea un array di TestGroup in una funzione buildXxxGroups()
//  2. Aggiungi una voce in TABS con le relative suite
//  3. La UI si aggiorna automaticamente

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  LogIn,
  ShieldCheck,
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
  emoji: string;
  tests: TestResult[];
  open: boolean;
}

// ---------------------------------------------------------------------------
// Utility runner
// ---------------------------------------------------------------------------
const assert = (condition: boolean, msg: string) => {
  if (!condition) throw new Error(msg);
};

function run(name: string, fn: () => void): TestResult {
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
}

function resetGroups(groups: TestGroup[]): TestGroup[] {
  return groups.map((g) => ({
    ...g,
    tests: g.tests.map((t) => ({ ...t, status: "idle" as TestStatus, detail: undefined, duration: undefined })),
  }));
}

// ---------------------------------------------------------------------------
// Suite AUTH
// ---------------------------------------------------------------------------
function runValidation(): TestResult[] {
  const validate = (email: string, password: string) => {
    if (!email || !password) return { ok: false, error: "Campi obbligatori" };
    if (!/^.+@.+\..+$/.test(email)) return { ok: false, error: "Email non valida" };
    if (password.length < 8) return { ok: false, error: "Password troppo corta" };
    return { ok: true };
  };
  const normalizeEmail = (e: string) => e.trim().toLowerCase();

  return [
    run("rifiuta password vuota", () => assert(validate("u@t.com", "").ok === false, "doveva essere false")),
    run("rifiuta email vuota", () => assert(validate("", "password123").ok === false, "doveva essere false")),
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
    run("accetta credenziali valide", () => assert(validate("user@test.com", "password123").ok === true, "doveva essere true")),
    run("normalizza email (lowercase + trim)", () =>
      assert(normalizeEmail("  User@Example.COM  ") === "user@example.com",
        `atteso 'user@example.com', ricevuto '${normalizeEmail("  User@Example.COM  ")}'`)
    ),
  ];
}

function runOtp(): TestResult[] {
  const generateOtp = (): string => {
    const min = 100000, max = 999999;
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(min + (arr[0] % (max - min + 1)));
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

function runRateLimit(): TestResult[] {
  const store = new Map<string, { count: number; resetAt: number }>();
  const check = (key: string, max: number, windowSec: number) => {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowSec * 1000 });
      return { blocked: false, remaining: max - 1 };
    }
    entry.count += 1;
    return { blocked: entry.count > max, remaining: Math.max(0, max - entry.count) };
  };

  return [
    run("prima richiesta non bloccata", () => {
      const r = check("rl-1", 3, 60);
      assert(!r.blocked, "non doveva essere bloccata");
      assert(r.remaining === 2, `remaining atteso 2, ricevuto ${r.remaining}`);
    }),
    run("blocca dopo aver superato il massimo", () => {
      check("rl-2", 2, 60); check("rl-2", 2, 60);
      const r = check("rl-2", 2, 60);
      assert(r.blocked, "doveva essere bloccata");
      assert(r.remaining === 0, `remaining atteso 0, ricevuto ${r.remaining}`);
    }),
    run("remaining non scende mai sotto zero", () => {
      for (let i = 0; i < 10; i++) check("rl-3", 2, 60);
      const r = check("rl-3", 2, 60);
      assert(r.remaining >= 0, `remaining negativo: ${r.remaining}`);
    }),
    run("chiavi diverse sono indipendenti", () => {
      check("rl-a", 2, 60); check("rl-a", 2, 60);
      const ra = check("rl-a", 2, 60);
      const rb = check("rl-b", 2, 60);
      assert(ra.blocked, "key-a doveva essere bloccata");
      assert(!rb.blocked, "key-b non doveva essere bloccata");
    }),
  ];
}

// ---------------------------------------------------------------------------
// Suite RBAC
// ---------------------------------------------------------------------------
function runRbacCan(): TestResult[] {
  // Replica in-memory della logica can() — override individuale + ruolo
  type UserLike = { id: number; role: string };

  // DB simulato
  const rolePermsDB: Record<string, string[]> = {
    admin:  ["admin:access", "admin:users", "admin:content", "admin:logs", "admin:settings"],
    member: ["content:read"],
    editor: ["content:read", "content:write", "admin:content"],
  };

  // Override: { userId → { permKey → granted } }
  const overridesDB: Record<number, Record<string, boolean>> = {};

  const can = (user: UserLike, key: string): boolean => {
    const userOverrides = overridesDB[user.id];
    if (userOverrides && key in userOverrides) return userOverrides[key];
    return (rolePermsDB[user.role] ?? []).includes(key);
  };

  const grantOverride = (userId: number, key: string, granted: boolean) => {
    if (!overridesDB[userId]) overridesDB[userId] = {};
    overridesDB[userId][key] = granted;
  };

  const getUserPermissions = (user: UserLike): Set<string> => {
    const set = new Set(rolePermsDB[user.role] ?? []);
    const ov = overridesDB[user.id] ?? {};
    for (const [k, granted] of Object.entries(ov)) {
      if (granted) set.add(k); else set.delete(k);
    }
    return set;
  };

  const admin: UserLike  = { id: 1, role: "admin" };
  const member: UserLike = { id: 2, role: "member" };
  const editor: UserLike = { id: 3, role: "editor" };
  const ghost: UserLike  = { id: 99, role: "unknown" };

  return [
    run("admin ha admin:access", () =>
      assert(can(admin, "admin:access"), "admin dovrebbe avere admin:access")
    ),
    run("member non ha admin:access", () =>
      assert(!can(member, "admin:access"), "member non dovrebbe avere admin:access")
    ),
    run("editor ha content:write", () =>
      assert(can(editor, "content:write"), "editor dovrebbe avere content:write")
    ),
    run("ruolo sconosciuto non ha nessun permesso", () =>
      assert(!can(ghost, "admin:access"), "ruolo sconosciuto non dovrebbe avere permessi")
    ),
    run("override grant aggiunge permesso non nel ruolo", () => {
      grantOverride(member.id, "admin:content", true);
      assert(can(member, "admin:content"), "override grant non applicato");
    }),
    run("override revoke rimuove permesso del ruolo", () => {
      grantOverride(admin.id, "admin:users", false);
      assert(!can(admin, "admin:users"), "override revoke non applicato");
    }),
    run("override non influenza altri utenti dello stesso ruolo", () => {
      // admin2 stesso ruolo di admin ma nessun override
      const admin2: UserLike = { id: 10, role: "admin" };
      assert(can(admin2, "admin:users"), "admin2 non dovrebbe essere influenzato dall'override di admin");
    }),
    run("getUserPermissions rispetta gli override", () => {
      // member ha ora override grant su admin:content
      const perms = getUserPermissions(member);
      assert(perms.has("admin:content"), "admin:content mancante dopo grant");
      assert(perms.has("content:read"), "content:read mancante (ruolo)");
    }),
    run("getUserPermissions esclude revocati", () => {
      const perms = getUserPermissions(admin);
      assert(!perms.has("admin:users"), "admin:users dovrebbe essere revocato");
      assert(perms.has("admin:access"), "admin:access dovrebbe essere ancora presente");
    }),
  ];
}

function runRbacGuards(): TestResult[] {
  // Replica della logica hasAdminAccess / requireAdmin in-memory
  type UserLike = { id: number; role: string; isAdmin?: boolean };

  const rolePermsDB: Record<string, string[]> = {
    admin:  ["admin:access"],
    member: [],
    staff:  ["admin:access", "admin:logs"],
  };

  const hasAdminAccess = (user: UserLike): boolean => {
    if (user.isAdmin) return true;
    return (rolePermsDB[user.role] ?? []).includes("admin:access");
  };

  const requireAdmin = (user: UserLike | null): { ok: boolean; error?: string } => {
    if (!user) return { ok: false, error: "Non autenticato" };
    if (!hasAdminAccess(user)) return { ok: false, error: "Non autorizzato" };
    return { ok: true };
  };

  const requireSectionPage = (user: UserLike | null, sectionPerm: string): { ok: boolean; redirect?: string } => {
    if (!user) return { ok: false, redirect: "/admin/sign-in" };
    if (user.isAdmin) return { ok: true };
    if (!hasAdminAccess(user)) return { ok: false, redirect: "/admin/sign-in" };
    const allowed = (rolePermsDB[user.role] ?? []).includes(sectionPerm);
    return allowed ? { ok: true } : { ok: false, redirect: "/admin" };
  };

  const superAdmin: UserLike = { id: 1, role: "member", isAdmin: true };
  const adminRole: UserLike  = { id: 2, role: "admin" };
  const staff: UserLike      = { id: 3, role: "staff" };
  const member: UserLike     = { id: 4, role: "member" };

  return [
    run("isAdmin=true bypassa qualsiasi check di ruolo", () =>
      assert(hasAdminAccess(superAdmin), "super admin dovrebbe avere accesso")
    ),
    run("ruolo admin ha accesso admin", () =>
      assert(hasAdminAccess(adminRole), "ruolo admin dovrebbe avere accesso")
    ),
    run("ruolo member non ha accesso admin", () =>
      assert(!hasAdminAccess(member), "member non dovrebbe avere accesso admin")
    ),
    run("utente non autenticato riceve errore 'Non autenticato'", () => {
      const r = requireAdmin(null);
      assert(!r.ok, "doveva fallire");
      assert(r.error === "Non autenticato", `messaggio errato: ${r.error}`);
    }),
    run("utente non autorizzato riceve errore 'Non autorizzato'", () => {
      const r = requireAdmin(member);
      assert(!r.ok, "doveva fallire");
      assert(r.error === "Non autorizzato", `messaggio errato: ${r.error}`);
    }),
    run("super admin bypassa requireSectionPage", () => {
      const r = requireSectionPage(superAdmin, "admin:qualsiasi");
      assert(r.ok, "super admin dovrebbe passare qualsiasi section guard");
    }),
    run("staff accede a sezione con permesso corretto", () => {
      const r = requireSectionPage(staff, "admin:logs");
      assert(r.ok, "staff dovrebbe accedere ad admin:logs");
    }),
    run("staff non accede a sezione senza permesso → redirect /admin", () => {
      const r = requireSectionPage(staff, "admin:users");
      assert(!r.ok && r.redirect === "/admin", `atteso redirect /admin, ricevuto: ${r.redirect}`);
    }),
    run("utente non autenticato → redirect /admin/sign-in", () => {
      const r = requireSectionPage(null, "admin:logs");
      assert(!r.ok && r.redirect === "/admin/sign-in", `atteso /admin/sign-in, ricevuto: ${r.redirect}`);
    }),
  ];
}

// ---------------------------------------------------------------------------
// Registro tabs
// ---------------------------------------------------------------------------
const TABS = [
  {
    id: "auth",
    label: "Auth",
    Icon: LogIn,
    buildGroups: (): TestGroup[] => [
      {
        key: "validation",
        label: "Validazione input",
        emoji: "✅",
        tests: runValidation().map((r) => ({ ...r, status: "idle" as TestStatus })),
        open: true,
      },
      {
        key: "otp",
        label: "Generazione OTP",
        emoji: "🔢",
        tests: runOtp().map((r) => ({ ...r, status: "idle" as TestStatus })),
        open: true,
      },
      {
        key: "ratelimit",
        label: "Rate Limit",
        emoji: "🛡️",
        tests: runRateLimit().map((r) => ({ ...r, status: "idle" as TestStatus })),
        open: true,
      },
    ],
    runAll: (): TestGroup[] => [
      { key: "validation", label: "Validazione input",   emoji: "✅", tests: runValidation(),  open: true },
      { key: "otp",        label: "Generazione OTP",     emoji: "🔢", tests: runOtp(),         open: true },
      { key: "ratelimit",  label: "Rate Limit",          emoji: "🛡️", tests: runRateLimit(),  open: true },
    ],
  },
  {
    id: "rbac",
    label: "RBAC",
    Icon: ShieldCheck,
    buildGroups: (): TestGroup[] => [
      {
        key: "can",
        label: "can() — risoluzione permessi",
        emoji: "🔑",
        tests: runRbacCan().map((r) => ({ ...r, status: "idle" as TestStatus })),
        open: true,
      },
      {
        key: "guards",
        label: "Guards — requireAdmin / requireSectionPage",
        emoji: "🚪",
        tests: runRbacGuards().map((r) => ({ ...r, status: "idle" as TestStatus })),
        open: true,
      },
    ],
    runAll: (): TestGroup[] => [
      { key: "can",    label: "can() — risoluzione permessi",               emoji: "🔑", tests: runRbacCan(),    open: true },
      { key: "guards", label: "Guards — requireAdmin / requireSectionPage", emoji: "🚪", tests: runRbacGuards(), open: true },
    ],
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------
export function TestsClient({ initialTab }: { initialTab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTabId = (TABS.find((t) => t.id === initialTab) ? initialTab : "auth") as TabId;
  const activeTab = TABS.find((t) => t.id === activeTabId)!;

  const [groups, setGroups] = useState<TestGroup[]>(() => activeTab.buildGroups());
  const [running, setRunning] = useState(false);

  const switchTab = useCallback(
    (id: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.push(`${pathname}?${params.toString()}`);
      const tab = TABS.find((t) => t.id === id)!;
      setGroups(tab.buildGroups());
      setRunning(false);
    },
    [router, pathname, searchParams],
  );

  const runAll = async () => {
    setRunning(true);
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        tests: g.tests.map((t) => ({ ...t, status: "running" as TestStatus, detail: undefined })),
      }))
    );
    await new Promise((r) => setTimeout(r, 100));
    setGroups(activeTab.runAll());
    setRunning(false);
  };

  const resetAll = () => {
    setGroups(resetGroups(activeTab.buildGroups()));
    setRunning(false);
  };

  const toggleGroup = (key: string) =>
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, open: !g.open } : g)));

  const totalTests = groups.reduce((s, g) => s + g.tests.length, 0);
  const passed     = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "pass").length, 0);
  const failed     = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "fail").length, 0);
  const idle       = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "idle").length, 0);
  const globalDone = passed + failed;
  const globalStatus: TestStatus =
    running ? "running" : globalDone === 0 ? "idle" : failed > 0 ? "fail" : "pass";

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className="flex items-center gap-1 p-1 rounded-xl w-fit"
          style={{ background: "var(--admin-hover-bg)" }}
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as TabId)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                style={{
                  background: isActive ? "var(--admin-accent)" : "transparent",
                  color: isActive ? "#fff" : "var(--admin-text-muted)",
                  boxShadow: isActive ? "0 1px 3px oklch(0 0 0 / 0.15)" : "none",
                }}
              >
                <tab.Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Azioni */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--admin-hover-bg)",
              color: "var(--admin-text-muted)",
              border: "1px solid var(--admin-card-border)",
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            onClick={runAll}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: running ? "var(--admin-hover-bg)" : "var(--admin-accent)",
              color: running ? "var(--admin-text-muted)" : "#fff",
              border: "none",
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            {running ? "Esecuzione..." : "Esegui tutti"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div
        className="rounded-xl p-4 flex items-center gap-6"
        style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
      >
        <Stat label="Totale"  value={totalTests} color="var(--admin-text-muted)" />
        <Stat label="Passati" value={passed}     color="#22c55e" />
        <Stat label="Falliti" value={failed}     color="#ef4444" />
        <Stat label="Idle"    value={idle}       color="var(--admin-text-faint)" />

        {globalStatus !== "idle" && (
          <div className="ml-auto flex items-center gap-2">
            {globalStatus === "pass" && <CheckCircle2 size={18} style={{ color: "#22c55e" }} />}
            {globalStatus === "fail" && <XCircle      size={18} style={{ color: "#ef4444" }} />}
            {globalStatus === "running" && <Loader2 size={18} className="animate-spin" style={{ color: "var(--admin-accent)" }} />}
            <span
              className="text-sm font-medium"
              style={{
                color: globalStatus === "pass" ? "#22c55e" : globalStatus === "fail" ? "#ef4444" : "var(--admin-accent)",
              }}
            >
              {globalStatus === "pass"
                ? "Tutti i test passati"
                : globalStatus === "fail"
                ? `${failed} test falliti`
                : "In esecuzione..."}
            </span>
          </div>
        )}
      </div>

      {/* Barra progresso */}
      {globalStatus !== "idle" && (
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--admin-card-border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round((globalDone / totalTests) * 100)}%`,
              background: failed > 0 ? "#ef4444" : "#22c55e",
            }}
          />
        </div>
      )}

      {/* Gruppi */}
      {groups.map((group) => {
        const gPassed  = group.tests.filter((t) => t.status === "pass").length;
        const gFailed  = group.tests.filter((t) => t.status === "fail").length;
        const gRunning = group.tests.some((t) => t.status === "running");

        return (
          <div
            key={group.key}
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--admin-card-border)", background: "var(--admin-card-bg)" }}
          >
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              style={{ borderBottom: group.open ? "1px solid var(--admin-divider)" : "none" }}
            >
              <div className="flex items-center gap-2">
                <span>{group.emoji}</span>
                <span className="font-semibold text-sm" style={{ color: "var(--admin-text)" }}>
                  {group.label}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background:
                      gFailed > 0 ? "#fef2f2"
                      : gRunning ? "#fef9c3"
                      : gPassed === group.tests.length && gPassed > 0 ? "#f0fdf4"
                      : "var(--admin-hover-bg)",
                    color:
                      gFailed > 0 ? "#dc2626"
                      : gRunning ? "#ca8a04"
                      : gPassed === group.tests.length && gPassed > 0 ? "#16a34a"
                      : "var(--admin-text-faint)",
                  }}
                >
                  {gRunning ? "in corso" : `${gPassed}/${group.tests.length}`}
                </span>
              </div>
              {group.open
                ? <ChevronUp   size={15} style={{ color: "var(--admin-text-faint)" }} />
                : <ChevronDown size={15} style={{ color: "var(--admin-text-faint)" }} />
              }
            </button>

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
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>{label}</span>
    </div>
  );
}

function TestRow({ test }: { test: TestResult }) {
  const icon = {
    idle:    <span className="w-4 h-4 rounded-full block" style={{ background: "var(--admin-card-border)" }} />,
    running: <Loader2      size={16} className="animate-spin" style={{ color: "var(--admin-accent)" }} />,
    pass:    <CheckCircle2 size={16} style={{ color: "#22c55e" }} />,
    fail:    <XCircle      size={16} style={{ color: "#ef4444" }} />,
  }[test.status];

  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <span
          className="text-sm"
          style={{
            color:
              test.status === "fail" ? "#ef4444"
              : test.status === "pass" ? "var(--admin-text)"
              : "var(--admin-text-muted)",
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
        <span className="text-xs shrink-0 tabular-nums" style={{ color: "var(--admin-text-faint)" }}>
          {test.duration}ms
        </span>
      )}
    </div>
  );
}
