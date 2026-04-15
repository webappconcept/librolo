"use client";
// app/(admin)/admin/tests/_components/tests-client.tsx
//
// Struttura UI:
//  - Tab orizzontali di sezione: Auth | RBAC | SEO | Contenuti
//  - Dentro ogni sezione: pill  Unit | Live   (modalità di esecuzione)
//  - Unit  → test in-memory, istantanei, nessuna dipendenza esterna
//  - Live  → chiama Server Actions reali (bcrypt, JWT, DB, RBAC)

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  FlaskConical, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, RotateCcw, LogIn, ShieldCheck, Plug, Zap, Search, FileText,
  type LucideIcon,
} from "lucide-react";
import {
  testDbPing, testHashPassword, testComparePasswords,
  testSignAndVerifyToken, testTokenExpiry, testGenerateOtp,
  testDisposableBlacklist, testRateLimitReal,
  testCanCurrentUser, testGetUserPermissions, testCanNegative,
  testReadSettings,
} from "../actions";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------
type TestStatus = "idle" | "running" | "pass" | "fail";
type Mode = "unit" | "live";

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

type LiveRunner = {
  name: string;
  fn: () => Promise<{ ok: boolean; detail?: string; durationMs: number; data?: Record<string, unknown> }>;
};

interface SectionDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  buildUnit: () => TestGroup[];
  liveRunners: LiveRunner[];
  hasLive: boolean;
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
// Auth — Unit groups
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
      run("rifiuta password vuota",         () => assert(!validate("u@t.com", "").ok, "doveva essere false")),
      run("rifiuta email vuota",             () => assert(!validate("", "pass1234").ok, "doveva essere false")),
      run("rifiuta email non valida",        () => { const r = validate("bad", "pass1234"); assert(!r.ok, "false"); assert((r as { ok: false; error: string }).error === "Email non valida", "msg"); }),
      run("rifiuta password < 8 caratteri",  () => { const r = validate("u@t.com", "abc"); assert(!r.ok, "false"); assert((r as { ok: false; error: string }).error === "Password troppo corta", "msg"); }),
      run("accetta credenziali valide",       () => assert(validate("u@t.com", "pass1234").ok, "doveva essere true")),
      run("normalizza email",                () => assert(normalizeEmail("  User@Example.COM  ") === "user@example.com", "normalizzazione fallita")),
    ]},
    { key: "otp", label: "Generazione OTP", emoji: "🔢", open: true, tests: [
      run("6 cifre esatte",                  () => assert(/^\d{6}$/.test(genOtp()), "formato errato")),
      run("range 100000–999999",             () => { for (let i = 0; i < 20; i++) { const n = parseInt(genOtp(), 10); assert(n >= 100000 && n <= 999999, `fuori range: ${n}`); } }),
      run("codici diversi ad ogni chiamata", () => assert(new Set(Array.from({ length: 10 }, genOtp)).size > 1, "tutti uguali")),
    ]},
    { key: "ratelimit", label: "Rate Limit (in-memory)", emoji: "🛡️", open: true, tests: [
      run("prima richiesta non bloccata",    () => { const r = checkRL("u1", 3, 60); assert(!r.blocked, "bloccata"); assert(r.remaining === 2, `rem=${r.remaining}`); }),
      run("blocca oltre il massimo",         () => { checkRL("u2", 2, 60); checkRL("u2", 2, 60); assert(checkRL("u2", 2, 60).blocked, "non bloccata"); }),
      run("remaining >= 0",                  () => { for (let i = 0; i < 10; i++) checkRL("u3", 2, 60); assert(checkRL("u3", 2, 60).remaining >= 0, "negativo"); }),
      run("chiavi indipendenti",             () => { checkRL("ka", 2, 60); checkRL("ka", 2, 60); assert(checkRL("ka", 2, 60).blocked, "ka"); assert(!checkRL("kb", 2, 60).blocked, "kb"); }),
    ]},
  ];
}

// ---------------------------------------------------------------------------
// RBAC — Unit groups
// ---------------------------------------------------------------------------
function buildRbacUnitGroups(): TestGroup[] {
  type U = { id: number; role: string; isAdmin?: boolean };
  const roleDB: Record<string, string[]> = { admin: ["admin:access", "admin:users", "admin:content", "admin:logs", "admin:settings"], member: ["content:read"], editor: ["content:read", "content:write", "admin:content"], staff: ["admin:access", "admin:logs"] };
  const ov: Record<number, Record<string, boolean>> = {};
  const can = (u: U, k: string) => { const o = ov[u.id]; if (o && k in o) return o[k]; return (roleDB[u.role] ?? []).includes(k); };
  const grant = (id: number, k: string, g: boolean) => { if (!ov[id]) ov[id] = {}; ov[id][k] = g; };
  const getPerms = (u: U) => { const s = new Set(roleDB[u.role] ?? []); for (const [k, g] of Object.entries(ov[u.id] ?? {})) g ? s.add(k) : s.delete(k); return s; };
  const hasAdminAccess = (u: U) => u.isAdmin || (roleDB[u.role] ?? []).includes("admin:access");
  const requireSection = (u: U | null, p: string) => { if (!u) return { ok: false, redirect: "/admin/sign-in" }; if (u.isAdmin) return { ok: true }; if (!hasAdminAccess(u)) return { ok: false, redirect: "/admin/sign-in" }; return (roleDB[u.role] ?? []).includes(p) ? { ok: true } : { ok: false, redirect: "/admin" }; };
  const admin: U = { id: 1, role: "admin" }, member: U = { id: 2, role: "member" }, editor: U = { id: 3, role: "editor" }, ghost: U = { id: 99, role: "unknown" }, super_: U = { id: 10, role: "member", isAdmin: true }, staff: U = { id: 5, role: "staff" };
  return [
    { key: "can", label: "can() — risoluzione permessi", emoji: "🔑", open: true, tests: [
      run("admin ha admin:access",                    () => assert(can(admin, "admin:access"), "mancante")),
      run("member non ha admin:access",               () => assert(!can(member, "admin:access"), "non doveva")),
      run("editor ha content:write",                  () => assert(can(editor, "content:write"), "mancante")),
      run("ruolo sconosciuto → nessun permesso",       () => assert(!can(ghost, "admin:access"), "non doveva")),
      run("override grant aggiunge permesso",          () => { grant(member.id, "admin:content", true); assert(can(member, "admin:content"), "non applicato"); }),
      run("override revoke rimuove permesso",          () => { grant(admin.id, "admin:users", false); assert(!can(admin, "admin:users"), "non applicato"); }),
      run("override non influenza altri stessa role",  () => { const a2: U = { id: 20, role: "admin" }; assert(can(a2, "admin:users"), "influenzato"); }),
      run("getUserPermissions rispetta grant",         () => { const p = getPerms(member); assert(p.has("admin:content"), "grant mancante"); assert(p.has("content:read"), "ruolo mancante"); }),
      run("getUserPermissions rispetta revoke",        () => { const p = getPerms(admin); assert(!p.has("admin:users"), "revoke ignorato"); assert(p.has("admin:access"), "access rimosso"); }),
    ]},
    { key: "guards", label: "Guards — requireAdmin / requireSectionPage", emoji: "🚪", open: true, tests: [
      run("isAdmin bypassa check ruolo",               () => assert(hasAdminAccess(super_), "super admin negato")),
      run("ruolo admin ha accesso",                    () => assert(hasAdminAccess(admin), "admin negato")),
      run("member non ha accesso admin",               () => assert(!hasAdminAccess(member), "member autorizzato")),
      run("super admin bypassa requireSectionPage",    () => assert(requireSection(super_, "qualsiasi").ok, "super negato")),
      run("staff accede a sezione con permesso",       () => assert(requireSection(staff, "admin:logs").ok, "staff negato")),
      run("staff → redirect /admin senza permesso",    () => { const r = requireSection(staff, "admin:users"); assert(!r.ok && r.redirect === "/admin", `${r.redirect}`); }),
      run("null → redirect /admin/sign-in",            () => { const r = requireSection(null, "admin:logs"); assert(!r.ok && r.redirect === "/admin/sign-in", `${r.redirect}`); }),
    ]},
  ];
}

// ---------------------------------------------------------------------------
// SEO — Unit groups
// ---------------------------------------------------------------------------
function buildSeoUnitGroups(): TestGroup[] {
  const ROBOTS_VALUES = ["", "noindex,nofollow", "noindex,follow"] as const;
  const schema = z.object({
    pathname: z.string().min(1).regex(/^\//, { message: "Il pathname deve iniziare con /" }),
    label: z.string().min(1, "Il nome è obbligatorio").max(100),
    title: z.string().max(70).optional(),
    description: z.string().max(160).optional(),
    ogTitle: z.string().max(70).optional(),
    ogDescription: z.string().max(200).optional(),
    ogImage: z.string().url().optional().or(z.literal("")),
    robots: z.enum(ROBOTS_VALUES).optional().transform((v) => v || null),
    jsonLdEnabled: z.boolean().default(false),
    jsonLdType: z.string().optional().nullable(),
  });
  const ok = { pathname: "/test", label: "Test" };
  const p = (data: object) => schema.safeParse(data);
  return [
    { key: "seo-pathname", label: "Pathname validation", emoji: "🔗", open: true, tests: [
      run("accetta pathname con /",                    () => assert(p({ ...ok }).success, "fail")),
      run("rifiuta pathname senza /",                  () => { const r = p({ ...ok, pathname: "noslash" }); assert(!r.success, "doveva fallire"); }),
      run("rifiuta pathname vuoto",                    () => assert(!p({ ...ok, pathname: "" }).success, "doveva fallire")),
      run("accetta /blog/sub-path",                    () => assert(p({ ...ok, pathname: "/blog/sub-path" }).success, "fail")),
    ]},
    { key: "seo-label", label: "Label validation", emoji: "🏷️", open: true, tests: [
      run("rifiuta label vuota",                       () => assert(!p({ ...ok, label: "" }).success, "doveva fallire")),
      run("rifiuta label > 100 char",                  () => assert(!p({ ...ok, label: "a".repeat(101) }).success, "doveva fallire")),
      run("accetta label di 100 char esatti",          () => assert(p({ ...ok, label: "a".repeat(100) }).success, "fail")),
    ]},
    { key: "seo-limits", label: "Limiti campi SEO", emoji: "📏", open: true, tests: [
      run("rifiuta title > 70 char",                   () => assert(!p({ ...ok, title: "a".repeat(71) }).success, "doveva fallire")),
      run("accetta title di 70 char",                  () => assert(p({ ...ok, title: "a".repeat(70) }).success, "fail")),
      run("rifiuta description > 160 char",            () => assert(!p({ ...ok, description: "a".repeat(161) }).success, "doveva fallire")),
      run("accetta description di 160 char",           () => assert(p({ ...ok, description: "a".repeat(160) }).success, "fail")),
      run("rifiuta ogTitle > 70 char",                 () => assert(!p({ ...ok, ogTitle: "a".repeat(71) }).success, "doveva fallire")),
      run("rifiuta ogDescription > 200 char",          () => assert(!p({ ...ok, ogDescription: "a".repeat(201) }).success, "doveva fallire")),
    ]},
    { key: "seo-image", label: "ogImage URL", emoji: "🖼️", open: true, tests: [
      run("accetta stringa vuota",                     () => assert(p({ ...ok, ogImage: "" }).success, "fail")),
      run("accetta URL https valido",                  () => assert(p({ ...ok, ogImage: "https://cdn.example.com/img.jpg" }).success, "fail")),
      run("rifiuta stringa non-URL",                   () => assert(!p({ ...ok, ogImage: "non-un-url" }).success, "doveva fallire")),
    ]},
    { key: "seo-robots", label: "Robots directive", emoji: "🤖", open: true, tests: [
      run("'' trasformato in null",                    () => { const r = p({ ...ok, robots: "" }); assert(r.success && (r.data as { robots: null }).robots === null, "non null"); }),
      run("accetta noindex,nofollow",                  () => assert(p({ ...ok, robots: "noindex,nofollow" }).success, "fail")),
      run("accetta noindex,follow",                    () => assert(p({ ...ok, robots: "noindex,follow" }).success, "fail")),
      run("rifiuta valore non previsto",               () => assert(!p({ ...ok, robots: "all" }).success, "doveva fallire")),
    ]},
  ];
}

// ---------------------------------------------------------------------------
// Contenuti — Unit groups
// ---------------------------------------------------------------------------
function buildContenutiUnitGroups(): TestGroup[] {
  const schema = z.object({
    id: z.string().optional(),
    originalSlug: z.string().optional(),
    slug: z
      .string()
      .min(1, "Lo slug è obbligatorio")
      .max(255)
      .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/, {
        message: "Slug non valido: usa solo lettere minuscole, numeri, trattini e slash",
      }),
    title: z.string().min(1, "Il titolo è obbligatorio").max(255),
    content: z.string().default(""),
    status: z.enum(["draft", "published"]).default("draft"),
    publishedAt: z.string().optional(),
    expiresAt: z.string().optional(),
    parentId: z.string().optional(),
    templateId: z.string().optional(),
    customFields: z.string().optional(),
    pageType: z.string().optional(),
    sortOrder: z.string().optional(),
  });
  const ok = { slug: "chi-siamo", title: "Chi siamo", status: "draft" as const };
  const p = (data: object) => schema.safeParse(data);
  const toggle = (s: string) => s === "published" ? "draft" : "published";
  const parseJson = (raw?: string): Record<string, unknown> => {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  };
  const resolveDate = (status: string, at?: string): Date | null => {
    if (status === "published") return at ? new Date(at) : new Date();
    if (at) return new Date(at);
    return null;
  };

  return [
    { key: "cont-slug", label: "Slug validation", emoji: "🔤", open: true, tests: [
      run("accetta slug lowercase semplice",            () => assert(p(ok).success, "fail")),
      run("accetta slug con trattini",                  () => assert(p({ ...ok, slug: "blog-post-1" }).success, "fail")),
      run("accetta slug con slash",                     () => assert(p({ ...ok, slug: "blog/post-1" }).success, "fail")),
      run("rifiuta slug vuoto",                         () => assert(!p({ ...ok, slug: "" }).success, "doveva fallire")),
      run("rifiuta slug con maiuscole",                 () => assert(!p({ ...ok, slug: "ChiSiamo" }).success, "doveva fallire")),
      run("rifiuta slug con spazi",                     () => assert(!p({ ...ok, slug: "chi siamo" }).success, "doveva fallire")),
      run("rifiuta slug che inizia con -",              () => assert(!p({ ...ok, slug: "-chi" }).success, "doveva fallire")),
      run("rifiuta slug con // doppio",                 () => assert(!p({ ...ok, slug: "blog//post" }).success, "doveva fallire")),
      run("rifiuta slug > 255 char",                    () => assert(!p({ ...ok, slug: "a".repeat(256) }).success, "doveva fallire")),
    ]},
    { key: "cont-title", label: "Title validation", emoji: "📝", open: true, tests: [
      run("rifiuta titolo vuoto",                       () => assert(!p({ ...ok, title: "" }).success, "doveva fallire")),
      run("rifiuta titolo > 255 char",                  () => assert(!p({ ...ok, title: "a".repeat(256) }).success, "doveva fallire")),
      run("accetta titolo di 255 char esatti",          () => assert(p({ ...ok, title: "a".repeat(255) }).success, "fail")),
    ]},
    { key: "cont-status", label: "Status & toggle", emoji: "🔀", open: true, tests: [
      run("default status è draft",                    () => { const r = p({ slug: "t", title: "T" }); assert(r.success && r.data.status === "draft", "non draft"); }),
      run("accetta published",                          () => assert(p({ ...ok, status: "published" }).success, "fail")),
      run("rifiuta status non previsto",                () => assert(!p({ ...ok, status: "archived" }).success, "doveva fallire")),
      run("toggle published → draft",                   () => assert(toggle("published") === "draft", "fail")),
      run("toggle draft → published",                   () => assert(toggle("draft") === "published", "fail")),
    ]},
    { key: "cont-json", label: "customFields JSON", emoji: "🗂️", open: true, tests: [
      run("stringa vuota → {}",                        () => assert(JSON.stringify(parseJson("")) === "{}", "fail")),
      run("undefined → {}",                            () => assert(JSON.stringify(parseJson(undefined)) === "{}", "fail")),
      run("JSON valido parsato",                       () => assert(parseJson('{"k":1}').k === 1, "fail")),
      run("JSON non valido → {} (no throw)",           () => assert(JSON.stringify(parseJson("{ bad }")) === "{}", "fail")),
    ]},
    { key: "cont-dates", label: "publishedAt risoluzione", emoji: "📅", open: true, tests: [
      run("published senza data → now",                () => { const before = Date.now(); const r = resolveDate("published"); assert(r !== null && r.getTime() >= before, "fail"); }),
      run("published con data specifica",              () => assert(resolveDate("published", "2025-01-15T10:00:00.000Z")?.toISOString() === "2025-01-15T10:00:00.000Z", "fail")),
      run("draft senza data → null",                   () => assert(resolveDate("draft") === null, "fail")),
      run("draft con data → conserva data",            () => assert(resolveDate("draft", "2025-06-01T00:00:00.000Z") !== null, "fail")),
    ]},
  ];
}

// ---------------------------------------------------------------------------
// Live runners
// ---------------------------------------------------------------------------
const AUTH_LIVE: LiveRunner[] = [
  { name: "DB ping (SELECT 1)",                    fn: testDbPing },
  { name: "hashPassword (bcrypt)",                  fn: testHashPassword },
  { name: "comparePasswords — match + no-match",    fn: testComparePasswords },
  { name: "signToken + verifyToken (JWT HS256)",    fn: testSignAndVerifyToken },
  { name: "verifyToken rifiuta JWT malformato",     fn: testTokenExpiry },
  { name: "generateOtpCode — 5 campioni reali",     fn: testGenerateOtp },
  { name: "isDomainBlacklisted (mailinator/gmail)", fn: testDisposableBlacklist },
  { name: "checkGeneralRateLimit — blocco reale",   fn: testRateLimitReal },
  { name: "getAppSettings — lettura DB",            fn: testReadSettings },
];

const RBAC_LIVE: LiveRunner[] = [
  { name: "DB ping (SELECT 1)",                               fn: testDbPing },
  { name: "can(currentUser, 'admin:access') → true",          fn: testCanCurrentUser },
  { name: "can(currentUser, '__ghost__') → false",            fn: testCanNegative },
  { name: "getUserPermissions — set completo dal DB",         fn: testGetUserPermissions },
];

async function runLiveGroups(
  runners: LiveRunner[],
  onUpdate: (tests: TestResult[]) => void,
): Promise<TestResult[]> {
  const results: TestResult[] = runners.map((r) => ({ name: r.name, status: "running" as TestStatus }));
  onUpdate([...results]);
  for (let i = 0; i < runners.length; i++) {
    try {
      const res = await runners[i].fn();
      results[i] = { name: runners[i].name, status: res.ok ? "pass" : "fail", detail: res.detail, duration: res.durationMs, data: res.data };
    } catch (e: unknown) {
      results[i] = { name: runners[i].name, status: "fail", detail: e instanceof Error ? e.message : String(e) };
    }
    onUpdate([...results]);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Sezioni (tab orizzontali)
// Tipizzato esplicitamente come SectionDef[] per evitare che TypeScript
// inferisca `liveRunners: []` come `readonly []` (non assegnabile a LiveRunner[]).
// ---------------------------------------------------------------------------
const SECTIONS: SectionDef[] = [
  { id: "auth",      label: "Auth",      Icon: LogIn,       buildUnit: buildAuthUnitGroups,      liveRunners: AUTH_LIVE,  hasLive: true  },
  { id: "rbac",      label: "RBAC",      Icon: ShieldCheck,  buildUnit: buildRbacUnitGroups,      liveRunners: RBAC_LIVE,  hasLive: true  },
  { id: "seo",       label: "SEO",       Icon: Search,       buildUnit: buildSeoUnitGroups,       liveRunners: [],         hasLive: false },
  { id: "contenuti", label: "Contenuti", Icon: FileText,     buildUnit: buildContenutiUnitGroups, liveRunners: [],         hasLive: false },
];

type SectionId = "auth" | "rbac" | "seo" | "contenuti";

function buildLiveGroups(runners: LiveRunner[]): TestGroup[] {
  return [{ key: "live", label: "Test sul server reale", emoji: "🔌", open: true, tests: runners.map((r) => ({ name: r.name, status: "idle" as TestStatus })) }];
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------
export function TestsClient({ initialTab }: { initialTab: string }) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const initSection  = (SECTIONS.find((s) => s.id === initialTab) ? initialTab : "auth") as SectionId;
  const [sectionId, setSectionId] = useState<SectionId>(initSection);
  const [mode, setMode]           = useState<Mode>("unit");
  const [running, setRunning]     = useState(false);

  const section = SECTIONS.find((s) => s.id === sectionId)!;

  const [groups, setGroups] = useState<TestGroup[]>(() =>
    mode === "unit" ? section.buildUnit() : buildLiveGroups(section.liveRunners)
  );

  // Cambio sezione
  const switchSection = useCallback((id: SectionId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.push(`${pathname}?${params.toString()}`);
    setSectionId(id);
    setRunning(false);
    const sec = SECTIONS.find((s) => s.id === id)!;
    const nextMode: Mode = (!sec.hasLive && mode === "live") ? "unit" : mode;
    setMode(nextMode);
    setGroups(nextMode === "unit" ? sec.buildUnit() : buildLiveGroups(sec.liveRunners));
  }, [router, pathname, searchParams, mode]);

  // Cambio modalità
  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setRunning(false);
    setGroups(m === "unit" ? section.buildUnit() : buildLiveGroups(section.liveRunners));
  }, [section]);

  // Esegui tutti (unit)
  const runUnit = useCallback(() => {
    setRunning(true);
    setGroups((prev) => prev.map((g) => ({ ...g, tests: g.tests.map((t) => ({ ...t, status: "running" as TestStatus })) })));
    setTimeout(() => { setGroups(section.buildUnit()); setRunning(false); }, 80);
  }, [section]);

  // Esegui tutti (live)
  const runLive = useCallback(async () => {
    setRunning(true);
    const runners = section.liveRunners;
    setGroups([{ key: "live", label: "Test sul server reale", emoji: "🔌", open: true, tests: runners.map((r) => ({ name: r.name, status: "running" as TestStatus })) }]);
    const results = await runLiveGroups(runners, (tests) =>
      setGroups([{ key: "live", label: "Test sul server reale", emoji: "🔌", open: true, tests }])
    );
    setGroups([{ key: "live", label: "Test sul server reale", emoji: "🔌", open: true, tests: results }]);
    setRunning(false);
  }, [section]);

  const runAll   = mode === "live" ? runLive : runUnit;
  const resetAll = () => { setGroups(idleGroups(mode === "unit" ? section.buildUnit() : buildLiveGroups(section.liveRunners))); setRunning(false); };
  const toggleGroup = (key: string) => setGroups((prev) => prev.map((g) => g.key === key ? { ...g, open: !g.open } : g));

  const totalTests = groups.reduce((s, g) => s + g.tests.length, 0);
  const passed     = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "pass").length, 0);
  const failed     = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "fail").length, 0);
  const idle       = groups.reduce((s, g) => s + g.tests.filter((t) => t.status === "idle").length, 0);
  const globalDone = passed + failed;
  const globalStatus: TestStatus = running ? "running" : globalDone === 0 ? "idle" : failed > 0 ? "fail" : "pass";

  return (
    <div className="space-y-4">

      {/* ── Riga controlli ── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Tab sezione */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--admin-hover-bg)" }}>
          {SECTIONS.map((sec) => {
            const active = sec.id === sectionId;
            return (
              <button key={sec.id} onClick={() => switchSection(sec.id as SectionId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: active ? "var(--admin-accent)" : "transparent", color: active ? "#fff" : "var(--admin-text-muted)", boxShadow: active ? "0 1px 3px oklch(0 0 0/0.15)" : "none" }}>
                <sec.Icon size={13} />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Separatore visivo */}
        <div className="w-px h-6" style={{ background: "var(--admin-card-border)" }} />

        {/* Pill modalità Unit / Live */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--admin-hover-bg)" }}>
          {(["unit", "live"] as Mode[]).map((m) => {
            const active   = mode === m;
            const isLive   = m === "live";
            const disabled = isLive && !section.hasLive;
            return (
              <button key={m} onClick={() => !disabled && switchMode(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? (isLive ? "#854d0e" : "#1d4ed8") : "transparent",
                  color: disabled ? "var(--admin-text-faint)" : active ? "#fff" : "var(--admin-text-muted)",
                  boxShadow: active ? "0 1px 3px oklch(0 0 0/0.15)" : "none",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                }}>
                {isLive ? <Plug size={12} /> : <Zap size={12} />}
                {m === "unit" ? "Unit" : "Live"}
              </button>
            );
          })}
        </div>

        {/* Azioni a destra */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={resetAll} disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)", border: "1px solid var(--admin-card-border)", cursor: running ? "not-allowed" : "pointer" }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={runAll} disabled={running}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: running ? "var(--admin-hover-bg)" : "var(--admin-accent)", color: running ? "var(--admin-text-muted)" : "#fff", border: "none", cursor: running ? "not-allowed" : "pointer" }}>
            {running ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            {running ? "Esecuzione..." : "Esegui tutti"}
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="rounded-xl p-4 flex items-center gap-6 flex-wrap" style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
        <Stat label="Totale"  value={totalTests} color="var(--admin-text-muted)" />
        <Stat label="Passati" value={passed}     color="#22c55e" />
        <Stat label="Falliti" value={failed}     color="#ef4444" />
        <Stat label="Idle"    value={idle}       color="var(--admin-text-faint)" />
        {globalStatus !== "idle" && (
          <div className="ml-auto flex items-center gap-2">
            {globalStatus === "pass"    && <CheckCircle2 size={18} style={{ color: "#22c55e" }} />}
            {globalStatus === "fail"    && <XCircle      size={18} style={{ color: "#ef4444" }} />}
            {globalStatus === "running" && <Loader2 size={18} className="animate-spin" style={{ color: "var(--admin-accent)" }} />}
            <span className="text-sm font-medium" style={{ color: globalStatus === "pass" ? "#22c55e" : globalStatus === "fail" ? "#ef4444" : "var(--admin-accent)" }}>
              {globalStatus === "pass" ? "Tutti i test passati" : globalStatus === "fail" ? `${failed} test falliti` : "In esecuzione..."}
            </span>
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {globalStatus !== "idle" && (
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--admin-card-border)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${totalTests ? Math.round((globalDone / totalTests) * 100) : 0}%`, background: failed > 0 ? "#ef4444" : "#22c55e" }} />
        </div>
      )}

      {/* ── Banner Live ── */}
      {mode === "live" && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: "color-mix(in srgb, var(--admin-accent) 8%, var(--admin-card-bg))", border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)" }}>
          <Plug size={15} style={{ color: "var(--admin-accent)", marginTop: 2, flexShrink: 0 }} />
          <span style={{ color: "var(--admin-text-muted)" }}>
            I test <strong style={{ color: "var(--admin-text)" }}>live</strong> chiamano le funzioni reali dell&apos;applicazione (bcrypt, JWT, DB, RBAC).
            Nessuna scrittura permanente viene eseguita.
          </span>
        </div>
      )}

      {/* ── Banner solo-unit per SEO / Contenuti ── */}
      {!section.hasLive && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: "color-mix(in srgb, var(--admin-accent) 5%, var(--admin-card-bg))", border: "1px solid color-mix(in srgb, var(--admin-accent) 15%, transparent)" }}>
          <Zap size={15} style={{ color: "var(--admin-accent)", marginTop: 2, flexShrink: 0 }} />
          <span style={{ color: "var(--admin-text-muted)" }}>
            I test <strong style={{ color: "var(--admin-text)" }}>Unit</strong> per questa sezione validano la logica di business e i vincoli degli schema
            direttamente in-memory — nessuna chiamata al DB.
          </span>
        </div>
      )}

      {/* ── Gruppi ── */}
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
                  background: gFailed > 0 ? "#fef2f2" : gRunning ? "#fef9c3" : gPassed === group.tests.length && gPassed > 0 ? "#f0fdf4" : "var(--admin-hover-bg)",
                  color: gFailed > 0 ? "#dc2626" : gRunning ? "#ca8a04" : gPassed === group.tests.length && gPassed > 0 ? "#16a34a" : "var(--admin-text-faint)",
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
          <span className="text-sm" style={{ color: test.status === "fail" ? "#ef4444" : test.status === "pass" ? "var(--admin-text)" : "var(--admin-text-muted)" }}>
            {test.name}
          </span>
          {test.detail && <p className="text-xs mt-0.5 font-mono" style={{ color: "#ef4444" }}>{test.detail}</p>}
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
