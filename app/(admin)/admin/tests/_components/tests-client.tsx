"use client";
// app/(admin)/admin/tests/_components/tests-client.tsx
//
// Test suite visuale con 4 tab:
//  - Auth Unit       : test in-memory, algoritmici, istantanei
//  - Auth Integration: chiama le vere Server Actions (bcrypt, JWT, OTP, DB)
//  - RBAC Unit       : replica in-memory di can() e guards
//  - RBAC Integration: chiama can() e getUserPermissions() sul DB reale
//
// Per aggiungere una categoria: aggiungi una voce in TABS.

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  FlaskConical, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, RotateCcw, LogIn, ShieldCheck, Zap, Plug,
} from "lucide-react";
import {
  testDbPing, testHashPassword, testComparePasswords,
  testSignAndVerifyToken, testTokenExpiry, testGenerateOtp,
  testDisposableBlacklist, testRateLimitReal,
  testCanCurrentUser, testGetUserPermissions, testCanNegative,
  testReadSettings,
} from "../actions";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------
type TestStatus = "idle" | "running" | "pass" | "fail";

interface TestResult {
  name: string;
  status: TestStatus;
  detail?: string;
  duration?: number;
  data?: Record<string, unknown>;
}

interface TestGroup {
  key: string;
  label: string;
  emoji: string;
  tests: TestResult[];
  open: boolean;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
const assert = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };

function run(name: string, fn: () => void): TestResult {
  const start = performance.now();
  try { fn(); return { name, status: "pass", duration: Math.round(performance.now() - start) }; }
  catch (e: unknown) { return { name, status: "fail", detail: e instanceof Error ? e.message : String(e), duration: Math.round(performance.now() - start) }; }
}

function idleGroups(groups: TestGroup[]): TestGroup[] {
  return groups.map((g) => ({ ...g, tests: g.tests.map((t) => ({ name: t.name, status: "idle" as TestStatus })) }));
}

// ---------------------------------------------------------------------------
// Suite UNIT — Auth
// ---------------------------------------------------------------------------
function buildAuthUnitGroups(): TestGroup[] {
  const validate = (email: string, pw: string) => {
    if (!email || !pw) return { ok: false, error: "Campi obbligatori" };
    if (!/^.+@.+\..+$/.test(email)) return { ok: false, error: "Email non valida" };
    if (pw.length < 8) return { ok: false, error: "Password troppo corta" };
    return { ok: true };
  };
  const normalizeEmail = (e: string) => e.trim().toLowerCase();
  const genOtp = (): string => { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(100000 + (a[0] % 900000)); };
  const store = new Map<string, { count: number; resetAt: number }>();
  const checkRL = (key: string, max: number, ws: number) => {
    const now = Date.now(), entry = store.get(key);
    if (!entry || now > entry.resetAt) { store.set(key, { count: 1, resetAt: now + ws * 1000 }); return { blocked: false, remaining: max - 1 }; }
    entry.count += 1; return { blocked: entry.count > max, remaining: Math.max(0, max - entry.count) };
  };

  return [
    { key: "validation", label: "Validazione input", emoji: "✅", open: true, tests: [
      run("rifiuta password vuota",         () => assert(!validate("u@t.com","").ok, "doveva essere false")),
      run("rifiuta email vuota",             () => assert(!validate("","pass1234").ok, "doveva essere false")),
      run("rifiuta email non valida",        () => { const r = validate("bad","pass1234"); assert(!r.ok,"false"); assert((r as {ok:false;error:string}).error==="Email non valida","msg"); }),
      run("rifiuta password < 8 caratteri",  () => { const r = validate("u@t.com","abc"); assert(!r.ok,"false"); assert((r as {ok:false;error:string}).error==="Password troppo corta","msg"); }),
      run("accetta credenziali valide",       () => assert(validate("u@t.com","pass1234").ok, "doveva essere true")),
      run("normalizza email",                () => assert(normalizeEmail("  User@Example.COM  ")==="user@example.com", "normalizzazione fallita")),
    ]},
    { key: "otp", label: "Generazione OTP (crypto.getRandomValues)", emoji: "🔢", open: true, tests: [
      run("6 cifre esatte",                  () => assert(/^\d{6}$/.test(genOtp()), "formato errato")),
      run("range 100000–999999",             () => { for(let i=0;i<20;i++){ const n=parseInt(genOtp(),10); assert(n>=100000&&n<=999999,`fuori range: ${n}`); } }),
      run("codici diversi ad ogni chiamata", () => assert(new Set(Array.from({length:10},genOtp)).size>1, "tutti uguali")),
    ]},
    { key: "ratelimit", label: "Rate Limit (in-memory)", emoji: "🛡️", open: true, tests: [
      run("prima richiesta non bloccata",    () => { const r=checkRL("u1",3,60); assert(!r.blocked,"bloccata"); assert(r.remaining===2,`rem=${r.remaining}`); }),
      run("blocca oltre il massimo",         () => { checkRL("u2",2,60); checkRL("u2",2,60); assert(checkRL("u2",2,60).blocked, "non bloccata"); }),
      run("remaining >= 0",                  () => { for(let i=0;i<10;i++) checkRL("u3",2,60); assert(checkRL("u3",2,60).remaining>=0,"negativo"); }),
      run("chiavi indipendenti",             () => { checkRL("ka",2,60); checkRL("ka",2,60); assert(checkRL("ka",2,60).blocked,"ka"); assert(!checkRL("kb",2,60).blocked,"kb"); }),
    ]},
  ];
}

// ---------------------------------------------------------------------------
// Suite UNIT — RBAC
// ---------------------------------------------------------------------------
function buildRbacUnitGroups(): TestGroup[] {
  type U = { id: number; role: string; isAdmin?: boolean };
  const roleDB: Record<string,string[]> = { admin:["admin:access","admin:users","admin:content","admin:logs","admin:settings"], member:["content:read"], editor:["content:read","content:write","admin:content"], staff:["admin:access","admin:logs"] };
  const ov: Record<number,Record<string,boolean>> = {};
  const can = (u:U,k:string) => { const o=ov[u.id]; if(o&&k in o) return o[k]; return (roleDB[u.role]??[]).includes(k); };
  const grant = (id:number,k:string,g:boolean) => { if(!ov[id]) ov[id]={}; ov[id][k]=g; };
  const getPerms = (u:U) => { const s=new Set(roleDB[u.role]??[]); for(const[k,g] of Object.entries(ov[u.id]??{})) g?s.add(k):s.delete(k); return s; };
  const hasAdminAccess = (u:U) => u.isAdmin || (roleDB[u.role]??[]).includes("admin:access");
  const requireSection = (u:U|null,p:string) => { if(!u) return {ok:false,redirect:"/admin/sign-in"}; if(u.isAdmin) return {ok:true}; if(!hasAdminAccess(u)) return {ok:false,redirect:"/admin/sign-in"}; return (roleDB[u.role]??[]).includes(p)?{ok:true}:{ok:false,redirect:"/admin"}; };
  const admin:U={id:1,role:"admin"}, member:U={id:2,role:"member"}, editor:U={id:3,role:"editor"}, ghost:U={id:99,role:"unknown"}, super_:U={id:10,role:"member",isAdmin:true}, staff:U={id:5,role:"staff"};

  return [
    { key: "can", label: "can() — risoluzione permessi", emoji: "🔑", open: true, tests: [
      run("admin ha admin:access",                     () => assert(can(admin,"admin:access"),"mancante")),
      run("member non ha admin:access",               () => assert(!can(member,"admin:access"),"non doveva")),
      run("editor ha content:write",                  () => assert(can(editor,"content:write"),"mancante")),
      run("ruolo sconosciuto → nessun permesso",       () => assert(!can(ghost,"admin:access"),"non doveva")),
      run("override grant aggiunge permesso",          () => { grant(member.id,"admin:content",true); assert(can(member,"admin:content"),"non applicato"); }),
      run("override revoke rimuove permesso",          () => { grant(admin.id,"admin:users",false); assert(!can(admin,"admin:users"),"non applicato"); }),
      run("override non influenza altri stessa role",  () => { const a2:U={id:20,role:"admin"}; assert(can(a2,"admin:users"),"influenzato"); }),
      run("getUserPermissions rispetta grant",         () => { const p=getPerms(member); assert(p.has("admin:content"),"grant mancante"); assert(p.has("content:read"),"ruolo mancante"); }),
      run("getUserPermissions rispetta revoke",        () => { const p=getPerms(admin); assert(!p.has("admin:users"),"revoke ignorato"); assert(p.has("admin:access"),"access rimosso"); }),
    ]},
    { key: "guards", label: "Guards — requireAdmin / requireSectionPage", emoji: "🚪", open: true, tests: [
      run("isAdmin bypassa check ruolo",               () => assert(hasAdminAccess(super_),"super admin negato")),
      run("ruolo admin ha accesso",                    () => assert(hasAdminAccess(admin),"admin negato")),
      run("member non ha accesso admin",               () => assert(!hasAdminAccess(member),"member autorizzato")),
      run("super admin bypassa requireSectionPage",    () => assert(requireSection(super_,"qualsiasi").ok,"super negato")),
      run("staff accede a sezione con permesso",       () => assert(requireSection(staff,"admin:logs").ok,"staff negato")),
      run("staff → redirect /admin senza permesso",    () => { const r=requireSection(staff,"admin:users"); assert(!r.ok&&r.redirect==="/admin",`${r.redirect}`); }),
      run("null → redirect /admin/sign-in",            () => { const r=requireSection(null,"admin:logs"); assert(!r.ok&&r.redirect==="/admin/sign-in",`${r.redirect}`); }),
    ]},
  ];
}

// ---------------------------------------------------------------------------
// Suite INTEGRATION — eseguono Server Actions asincrone
// ---------------------------------------------------------------------------
type IntegrationRunner = {
  name: string;
  fn: () => Promise<{ ok: boolean; detail?: string; durationMs: number; data?: Record<string, unknown> }>;
};

const AUTH_INTEGRATION_RUNNERS: IntegrationRunner[] = [
  { name: "DB ping (SELECT 1)",                  fn: testDbPing },
  { name: "hashPassword (bcrypt)",                fn: testHashPassword },
  { name: "comparePasswords — match + no-match",  fn: testComparePasswords },
  { name: "signToken + verifyToken (JWT HS256)",  fn: testSignAndVerifyToken },
  { name: "verifyToken rifiuta JWT malformato",   fn: testTokenExpiry },
  { name: "generateOtpCode — 5 campioni reali",   fn: testGenerateOtp },
  { name: "isDomainBlacklisted (mailinator/gmail)",fn: testDisposableBlacklist },
  { name: "checkGeneralRateLimit — blocco reale", fn: testRateLimitReal },
  { name: "DB settings — getAppSettings",         fn: testReadSettings },
];

const RBAC_INTEGRATION_RUNNERS: IntegrationRunner[] = [
  { name: "DB ping (SELECT 1)",                                   fn: testDbPing },
  { name: "can(currentUser, 'admin:access') → true",             fn: testCanCurrentUser },
  { name: "can(currentUser, '__ghost__') → false",               fn: testCanNegative },
  { name: "getUserPermissions — set completo dal DB",             fn: testGetUserPermissions },
];

function buildIntegrationGroups(runners: IntegrationRunner[]): TestGroup[] {
  return [{
    key: "integration",
    label: "Test sul server reale",
    emoji: "🔌",
    open: true,
    tests: runners.map((r) => ({ name: r.name, status: "idle" as TestStatus })),
  }];
}

async function runIntegrationGroup(
  runners: IntegrationRunner[],
  onUpdate: (tests: TestResult[]) => void,
): Promise<TestResult[]> {
  const results: TestResult[] = runners.map((r) => ({ name: r.name, status: "running" as TestStatus }));
  onUpdate([...results]);

  for (let i = 0; i < runners.length; i++) {
    const { name, fn } = runners[i];
    try {
      const res = await fn();
      results[i] = {
        name,
        status: res.ok ? "pass" : "fail",
        detail: res.detail,
        duration: res.durationMs,
        data: res.data,
      };
    } catch (e: unknown) {
      results[i] = { name, status: "fail", detail: e instanceof Error ? e.message : String(e) };
    }
    onUpdate([...results]);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Registro TABS
// ---------------------------------------------------------------------------
const TABS = [
  { id: "auth-unit",        label: "Auth — Unit",        Icon: LogIn,        badge: "unit",        buildGroups: buildAuthUnitGroups },
  { id: "auth-integration", label: "Auth — Integration", Icon: Plug,         badge: "live",        buildGroups: () => buildIntegrationGroups(AUTH_INTEGRATION_RUNNERS) },
  { id: "rbac-unit",        label: "RBAC — Unit",        Icon: ShieldCheck,  badge: "unit",        buildGroups: buildRbacUnitGroups },
  { id: "rbac-integration", label: "RBAC — Integration", Icon: Zap,          badge: "live",        buildGroups: () => buildIntegrationGroups(RBAC_INTEGRATION_RUNNERS) },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  unit: { bg: "#eff6ff", color: "#1d4ed8" },
  live: { bg: "#fef9c3", color: "#854d0e" },
};

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------
export function TestsClient({ initialTab }: { initialTab: string }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const activeTabId  = (TABS.find((t) => t.id === initialTab) ? initialTab : "auth-unit") as TabId;
  const activeTab    = TABS.find((t) => t.id === activeTabId)!;
  const isIntegration = activeTabId.endsWith("-integration");

  const [groups,  setGroups]  = useState<TestGroup[]>(() => activeTab.buildGroups());
  const [running, setRunning] = useState(false);

  const switchTab = useCallback((id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.push(`${pathname}?${params.toString()}`);
    const tab = TABS.find((t) => t.id === id)!;
    setGroups(tab.buildGroups());
    setRunning(false);
  }, [router, pathname, searchParams]);

  // ----- Runner sync (unit) -----
  const runUnitAll = useCallback(() => {
    setRunning(true);
    setGroups((prev) => prev.map((g) => ({ ...g, tests: g.tests.map((t) => ({ ...t, status: "running" as TestStatus })) })));
    setTimeout(() => {
      const fresh = activeTab.buildGroups();
      setGroups(fresh);
      setRunning(false);
    }, 80);
  }, [activeTab]);

  // ----- Runner async (integration) -----
  const runIntegrationAll = useCallback(async () => {
    setRunning(true);
    const runners = activeTabId === "auth-integration" ? AUTH_INTEGRATION_RUNNERS : RBAC_INTEGRATION_RUNNERS;
    setGroups([{ key: "integration", label: "Test sul server reale", emoji: "🔌", open: true, tests: runners.map((r) => ({ name: r.name, status: "running" as TestStatus })) }]);
    const results = await runIntegrationGroup(runners, (tests) =>
      setGroups([{ key: "integration", label: "Test sul server reale", emoji: "🔌", open: true, tests }])
    );
    setGroups([{ key: "integration", label: "Test sul server reale", emoji: "🔌", open: true, tests: results }]);
    setRunning(false);
  }, [activeTabId]);

  const runAll  = isIntegration ? runIntegrationAll : runUnitAll;
  const resetAll = () => { setGroups(idleGroups(activeTab.buildGroups())); setRunning(false); };
  const toggleGroup = (key: string) => setGroups((prev) => prev.map((g) => g.key === key ? { ...g, open: !g.open } : g));

  const totalTests = groups.reduce((s, g) => s + g.tests.length, 0);
  const passed     = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "pass").length, 0);
  const failed     = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "fail").length, 0);
  const idle       = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "idle").length, 0);
  const globalDone = passed + failed;
  const globalStatus: TestStatus = running ? "running" : globalDone === 0 ? "idle" : failed > 0 ? "fail" : "pass";

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--admin-hover-bg)" }}>
          {TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            const badge = BADGE_STYLE[tab.badge];
            return (
              <button key={tab.id} onClick={() => switchTab(tab.id as TabId)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all"
                style={{ background: isActive ? "var(--admin-accent)" : "transparent", color: isActive ? "#fff" : "var(--admin-text-muted)", boxShadow: isActive ? "0 1px 3px oklch(0 0 0/0.15)" : "none" }}
              >
                <tab.Icon size={13} />
                <span>{tab.label}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: isActive ? "rgba(255,255,255,0.25)" : badge.bg, color: isActive ? "#fff" : badge.color }}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Azioni */}
        <div className="flex items-center gap-2">
          <button onClick={resetAll} disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)", border: "1px solid var(--admin-card-border)", cursor: running ? "not-allowed" : "pointer" }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={runAll} disabled={running}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: running ? "var(--admin-hover-bg)" : "var(--admin-accent)", color: running ? "var(--admin-text-muted)" : "#fff", border: "none", cursor: running ? "not-allowed" : "pointer" }}>
            {running ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            {running ? (isIntegration ? "In esecuzione..." : "Esecuzione...") : "Esegui tutti"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl p-4 flex items-center gap-6" style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
        <Stat label="Totale"  value={totalTests} color="var(--admin-text-muted)" />
        <Stat label="Passati" value={passed}     color="#22c55e" />
        <Stat label="Falliti" value={failed}     color="#ef4444" />
        <Stat label="Idle"    value={idle}       color="var(--admin-text-faint)" />
        {globalStatus !== "idle" && (
          <div className="ml-auto flex items-center gap-2">
            {globalStatus === "pass"    && <CheckCircle2 size={18} style={{ color: "#22c55e" }} />}
            {globalStatus === "fail"    && <XCircle      size={18} style={{ color: "#ef4444" }} />}
            {globalStatus === "running" && <Loader2 size={18} className="animate-spin" style={{ color: "var(--admin-accent)" }} />}
            <span className="text-sm font-medium" style={{ color: globalStatus==="pass"?"#22c55e":globalStatus==="fail"?"#ef4444":"var(--admin-accent)" }}>
              {globalStatus==="pass"?"Tutti i test passati":globalStatus==="fail"?`${failed} test falliti`:"In esecuzione..."}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {globalStatus !== "idle" && (
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--admin-card-border)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.round((globalDone/totalTests)*100)}%`, background: failed>0?"#ef4444":"#22c55e" }} />
        </div>
      )}

      {/* Nota tab integration */}
      {isIntegration && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: "color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg))", border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)" }}>
          <Plug size={15} style={{ color: "var(--admin-accent)", marginTop: 2, flexShrink: 0 }} />
          <span style={{ color: "var(--admin-text-muted)" }}>
            I test <strong style={{ color: "var(--admin-text)" }}>live</strong> chiamano le funzioni reali dell&apos;applicazione (bcrypt, JWT, DB, RBAC).
            Nessuna scrittura permanente viene eseguita. I risultati mostrano la latenza reale del server.
          </span>
        </div>
      )}

      {/* Gruppi */}
      {groups.map((group) => {
        const gPassed  = group.tests.filter((t) => t.status === "pass").length;
        const gFailed  = group.tests.filter((t) => t.status === "fail").length;
        const gRunning = group.tests.some((t) => t.status === "running");
        return (
          <div key={group.key} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--admin-card-border)", background: "var(--admin-card-bg)" }}>
            <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center justify-between px-4 py-3 text-left"
              style={{ borderBottom: group.open ? "1px solid var(--admin-divider)" : "none" }}>
              <div className="flex items-center gap-2">
                <span>{group.emoji}</span>
                <span className="font-semibold text-sm" style={{ color: "var(--admin-text)" }}>{group.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                  background: gFailed>0?"#fef2f2":gRunning?"#fef9c3":gPassed===group.tests.length&&gPassed>0?"#f0fdf4":"var(--admin-hover-bg)",
                  color: gFailed>0?"#dc2626":gRunning?"#ca8a04":gPassed===group.tests.length&&gPassed>0?"#16a34a":"var(--admin-text-faint)",
                }}>
                  {gRunning ? "in corso" : `${gPassed}/${group.tests.length}`}
                </span>
              </div>
              {group.open ? <ChevronUp size={15} style={{ color: "var(--admin-text-faint)" }} /> : <ChevronDown size={15} style={{ color: "var(--admin-text-faint)" }} />}
            </button>
            {group.open && (
              <div className="divide-y" style={{ borderColor: "var(--admin-divider)" }}>
                {group.tests.map((test) => <TestRow key={test.name} test={test} />)}
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
  const [open, setOpen] = useState(false);
  const hasData = test.data && Object.keys(test.data).length > 0;

  const icon = {
    idle:    <span className="w-4 h-4 rounded-full block" style={{ background: "var(--admin-card-border)" }} />,
    running: <Loader2      size={16} className="animate-spin" style={{ color: "var(--admin-accent)" }} />,
    pass:    <CheckCircle2 size={16} style={{ color: "#22c55e" }} />,
    fail:    <XCircle      size={16} style={{ color: "#ef4444" }} />,
  }[test.status];

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <span className="text-sm" style={{ color: test.status==="fail"?"#ef4444":test.status==="pass"?"var(--admin-text)":"var(--admin-text-muted)" }}>
            {test.name}
          </span>
          {test.detail && (
            <p className="text-xs mt-0.5 font-mono" style={{ color: "#ef4444" }}>{test.detail}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {test.duration !== undefined && (
            <span className="text-xs tabular-nums" style={{ color: "var(--admin-text-faint)" }}>{test.duration}ms</span>
          )}
          {hasData && test.status === "pass" && (
            <button onClick={() => setOpen((v) => !v)}
              className="text-xs px-2 py-0.5 rounded-md"
              style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-faint)", border: "1px solid var(--admin-card-border)" }}>
              {open ? "nascondi" : "dettagli"}
            </button>
          )}
        </div>
      </div>
      {open && hasData && (
        <pre className="mt-2 ml-7 text-[11px] font-mono rounded-lg p-3 overflow-x-auto"
          style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)", border: "1px solid var(--admin-card-border)" }}>
          {JSON.stringify(test.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
