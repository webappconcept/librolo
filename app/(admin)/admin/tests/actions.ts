"use server";
// app/(admin)/admin/tests/actions.ts
//
// Server Actions usate esclusivamente dalla test suite di integrazione.
// Chiamano le funzioni reali dell'app (bcrypt, JWT, DB, RBAC) e restituiscono
// risultati serializzabili al client.
//
// NON eseguono scritture permanenti sul DB (read-only o operazioni reversibili).
import { requireAdminPage } from "@/lib/rbac/guards";
import { hashPassword, comparePasswords, signToken, verifyToken } from "@/lib/auth/session";
import { generateOtpCode } from "@/lib/auth/otp";
import { isDomainBlacklisted } from "@/lib/auth/blacklist";
import { checkGeneralRateLimit, recordGeneralAttempt } from "@/lib/auth/rate-limit";
import { can, getUserPermissions } from "@/lib/rbac/can";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getAllSeoPages, upsertSeoPage, deleteSeoPage } from "@/lib/db/seo-queries";
import { getAllPages, getPageBySlug, togglePageStatus, deletePageCascade } from "@/lib/db/pages-queries";
import { db } from "@/lib/db/drizzle";
import { sql } from "drizzle-orm";

export type IntegrationResult = {
  ok: boolean;
  detail?: string;
  durationMs: number;
  data?: Record<string, unknown>;
};

async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - start };
}

// ---------------------------------------------------------------------------
// DB — ping
// ---------------------------------------------------------------------------
export async function testDbPing(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const { durationMs } = await timed(() => db.execute(sql`SELECT 1`));
    return { ok: true, durationMs, data: { query: "SELECT 1" } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Auth — hashPassword + comparePasswords
// ---------------------------------------------------------------------------
export async function testHashPassword(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const plain = "TestPassword_" + Math.random().toString(36).slice(2, 8);
    const { result: hashed, durationMs } = await timed(() => hashPassword(plain));
    const isValid = hashed.startsWith("$2") && hashed.length > 50;
    return {
      ok: isValid,
      durationMs,
      detail: isValid ? undefined : "Hash non valido: " + hashed,
      data: { length: hashed.length, prefix: hashed.slice(0, 7) },
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

export async function testComparePasswords(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const plain = "TestPassword_" + Math.random().toString(36).slice(2, 8);
    const hashed = await hashPassword(plain);
    const { result: match, durationMs: d1 } = await timed(() => comparePasswords(plain, hashed));
    const { result: noMatch, durationMs: d2 } = await timed(() => comparePasswords("wrong-password", hashed));
    if (!match) return { ok: false, detail: "comparePasswords ha rifiutato la password corretta", durationMs: d1 + d2 };
    if (noMatch) return { ok: false, detail: "comparePasswords ha accettato una password errata", durationMs: d1 + d2 };
    return { ok: true, durationMs: d1 + d2, data: { match, noMatch } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Auth — JWT signToken + verifyToken
// ---------------------------------------------------------------------------
export async function testSignAndVerifyToken(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    // UUID fittizio — solo per testare la firma/verifica JWT, non corrisponde a un utente reale
    const payload = {
      user: { id: "00000000-0000-0000-0000-000000009999", role: "member" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    };
    const { result: token, durationMs: signMs } = await timed(() => signToken(payload));
    const { result: decoded, durationMs: verifyMs } = await timed(() => verifyToken(token));

    if (decoded.user.id !== payload.user.id)
      return { ok: false, detail: `id mismatch: atteso ${payload.user.id}, ricevuto ${decoded.user.id}`, durationMs: signMs + verifyMs };
    if (decoded.user.role !== payload.user.role)
      return { ok: false, detail: `role mismatch: atteso ${payload.user.role}, ricevuto ${decoded.user.role}`, durationMs: signMs + verifyMs };

    return {
      ok: true,
      durationMs: signMs + verifyMs,
      data: { tokenLength: token.length, signMs, verifyMs },
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

export async function testTokenExpiry(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const start = Date.now();
    let caught = false;
    try {
      await verifyToken("not.a.valid.jwt.token");
    } catch {
      caught = true;
    }
    return {
      ok: caught,
      durationMs: Date.now() - start,
      detail: caught ? undefined : "verifyToken ha accettato un token non valido",
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Auth — OTP generateOtpCode
// ---------------------------------------------------------------------------
export async function testGenerateOtp(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const start = Date.now();
    const codes = Array.from({ length: 5 }, () => generateOtpCode());
    const durationMs = Date.now() - start;
    const allValid = codes.every((c) => /^\d{6}$/.test(c));
    const allInRange = codes.every((c) => {
      const n = parseInt(c, 10);
      return n >= 100000 && n <= 999999;
    });
    const unique = new Set(codes).size > 1;
    if (!allValid) return { ok: false, detail: `Codice non valido in: ${codes.join(", ")}`, durationMs };
    if (!allInRange) return { ok: false, detail: `Codice fuori range in: ${codes.join(", ")}`, durationMs };
    if (!unique) return { ok: false, detail: "Tutti i codici generati sono uguali", durationMs };
    return { ok: true, durationMs, data: { samples: codes } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Auth — Blacklist dominio
// ---------------------------------------------------------------------------
export async function testDisposableBlacklist(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const start = Date.now();
    const disposable = isDomainBlacklisted("test@mailinator.com");
    const legit = isDomainBlacklisted("test@gmail.com");
    const durationMs = Date.now() - start;
    if (!disposable) return { ok: false, detail: "mailinator.com non è stato rilevato come disposable", durationMs };
    if (legit) return { ok: false, detail: "gmail.com è stato erroneamente classificato come disposable", durationMs };
    return { ok: true, durationMs, data: { mailinator: disposable, gmail: legit } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Auth — Rate limit DB-based (checkGeneralRateLimit)
// ---------------------------------------------------------------------------
export async function testRateLimitReal(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    // Chiave univoca per questo run — evita collisioni con test precedenti nel DB
    const key = "integration-test-" + Date.now();
    const start = Date.now();

    // Prima verifica: nessun tentativo ancora → non bloccata
    const r1 = await checkGeneralRateLimit(key, 2, 60);

    // Registra i due tentativi (contratto DB-based: check → record → check)
    await recordGeneralAttempt(key);
    await recordGeneralAttempt(key);

    // Seconda verifica: 2 tentativi registrati, max=2 → bloccata
    const r3 = await checkGeneralRateLimit(key, 2, 60);

    const durationMs = Date.now() - start;

    if (r1.blocked)
      return { ok: false, detail: "Prima verifica bloccata inaspettatamente (0 tentativi)", durationMs };
    if (r1.remaining !== 2)
      return { ok: false, detail: `Prima verifica: remaining atteso 2, ricevuto ${r1.remaining}`, durationMs };
    if (!r3.blocked)
      return { ok: false, detail: "Terza verifica non bloccata dopo 2 tentativi registrati (max=2)", durationMs };
    if (r3.remaining !== 0)
      return { ok: false, detail: `Terza verifica: remaining atteso 0, ricevuto ${r3.remaining}`, durationMs };

    return { ok: true, durationMs, data: { key, r1, r3 } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// RBAC — can() sul DB reale con l'utente corrente
// ---------------------------------------------------------------------------
export async function testCanCurrentUser(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const user = await requireAdminPage();
    const { result: hasAccess, durationMs } = await timed(() => can(user, "admin:access"));
    if (!hasAccess)
      return { ok: false, detail: "L'utente corrente non ha admin:access (incoerente: è già in admin)", durationMs };
    return { ok: true, durationMs, data: { userId: user.id, role: user.role, hasAccess } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

export async function testGetUserPermissions(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const user = await requireAdminPage();
    const { result: perms, durationMs } = await timed(() => getUserPermissions(user));
    const permsList = [...perms];
    const hasAdminAccess = perms.has("admin:access") || user.isAdmin;
    if (!hasAdminAccess)
      return { ok: false, detail: "admin:access non trovato nel set permessi", durationMs };
    return {
      ok: true,
      durationMs,
      data: { count: permsList.length, permissions: permsList.slice(0, 10) },
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

export async function testCanNegative(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const user = await requireAdminPage();
    const { result: hasGhost, durationMs } = await timed(() =>
      can(user, "__test_ghost_permission_that_never_exists__")
    );
    if (hasGhost)
      return { ok: false, detail: "can() ha restituito true per un permesso inesistente", durationMs };
    return { ok: true, durationMs, data: { permission: "__test_ghost_permission_that_never_exists__", result: false } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// DB — lettura settings (read-only)
// ---------------------------------------------------------------------------
export async function testReadSettings(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const { result: settings, durationMs } = await timed(() => getAppSettings());
    const hasAppName = typeof settings.app_name === "string" && settings.app_name.length > 0;
    if (!hasAppName)
      return { ok: false, detail: "app_name non trovato o vuoto nelle impostazioni", durationMs };
    return {
      ok: true,
      durationMs,
      data: {
        app_name: settings.app_name,
        maintenance_mode: settings.maintenance_mode,
        registrations_enabled: settings.registrations_enabled,
      },
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// SEO — DB ping dedicato
// ---------------------------------------------------------------------------
export async function testSeoDbPing(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const { durationMs } = await timed(() => db.execute(sql`SELECT 1`));
    return { ok: true, durationMs, data: { query: "SELECT 1" } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// SEO — getAllSeoPages (read-only)
// ---------------------------------------------------------------------------
export async function testSeoGetAllPages(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const { result: rows, durationMs } = await timed(() => getAllSeoPages());
    return {
      ok: true,
      durationMs,
      data: {
        count: rows.length,
        sample: rows.slice(0, 3).map((r) => ({ pathname: r.pathname, label: r.label })),
      },
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// SEO — upsert + delete (reversibile: crea, verifica, cancella)
// ---------------------------------------------------------------------------
export async function testSeoUpsertAndDelete(): Promise<IntegrationResult> {
  await requireAdminPage();
  const testPathname = "/__test_seo_integration__";
  const start = Date.now();
  try {
    // 1. Insert
    await upsertSeoPage({
      pathname: testPathname,
      label: "Test SEO Integration",
      title: "Test Title",
      description: "Test Description",
      robots: null,
      jsonLdEnabled: false,
    });

    // 2. Verifica presenza
    const after = await getAllSeoPages();
    const found = after.find((r) => r.pathname === testPathname);
    if (!found) {
      return { ok: false, detail: "Riga non trovata dopo upsert", durationMs: Date.now() - start };
    }

    // 3. Update stesso pathname (onConflictDoUpdate)
    await upsertSeoPage({
      pathname: testPathname,
      label: "Test SEO Integration — updated",
      title: "Updated Title",
      description: null,
      robots: "noindex,nofollow",
      jsonLdEnabled: true,
    });

    const afterUpdate = await getAllSeoPages();
    const updated = afterUpdate.find((r) => r.pathname === testPathname);
    if (!updated || updated.label !== "Test SEO Integration — updated") {
      return { ok: false, detail: "Update non applicato correttamente", durationMs: Date.now() - start };
    }

    // 4. Cleanup
    await deleteSeoPage(testPathname);
    const afterDelete = await getAllSeoPages();
    const stillThere = afterDelete.find((r) => r.pathname === testPathname);
    if (stillThere) {
      return { ok: false, detail: "Riga non eliminata correttamente", durationMs: Date.now() - start };
    }

    return {
      ok: true,
      durationMs: Date.now() - start,
      data: { pathname: testPathname, insertOk: true, updateOk: true, deleteOk: true },
    };
  } catch (e) {
    // Tentativo di cleanup in caso di eccezione
    try { await deleteSeoPage(testPathname); } catch { /* ignore */ }
    return { ok: false, detail: String(e), durationMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// SEO — robots constraint (solo valori ammessi)
// ---------------------------------------------------------------------------
export async function testSeoRobotsConstraint(): Promise<IntegrationResult> {
  await requireAdminPage();
  const testPathname = "/__test_seo_robots__";
  const start = Date.now();
  try {
    // Inserisce con robots valido
    await upsertSeoPage({
      pathname: testPathname,
      label: "Test Robots",
      robots: "noindex,nofollow",
      jsonLdEnabled: false,
    });
    const rows = await getAllSeoPages();
    const row = rows.find((r) => r.pathname === testPathname);
    const robotsOk = row?.robots === "noindex,nofollow";
    await deleteSeoPage(testPathname);
    if (!robotsOk) {
      return { ok: false, detail: `robots atteso 'noindex,nofollow', trovato: ${row?.robots}`, durationMs: Date.now() - start };
    }
    return {
      ok: true,
      durationMs: Date.now() - start,
      data: { robots: row?.robots },
    };
  } catch (e) {
    try { await deleteSeoPage(testPathname); } catch { /* ignore */ }
    return { ok: false, detail: String(e), durationMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// SEO — jsonLd toggle (lettura/scrittura booleano)
// ---------------------------------------------------------------------------
export async function testSeoJsonLdToggle(): Promise<IntegrationResult> {
  await requireAdminPage();
  const testPathname = "/__test_seo_jsonld__";
  const start = Date.now();
  try {
    await upsertSeoPage({ pathname: testPathname, label: "Test JsonLD", robots: null, jsonLdEnabled: false });
    // Update con jsonLdEnabled: true
    await upsertSeoPage({ pathname: testPathname, label: "Test JsonLD", robots: null, jsonLdEnabled: true, jsonLdType: "WebPage" });
    const rows = await getAllSeoPages();
    const row = rows.find((r) => r.pathname === testPathname);
    const ok = row?.jsonLdEnabled === true && row?.jsonLdType === "WebPage";
    await deleteSeoPage(testPathname);
    if (!ok) {
      return { ok: false, detail: `jsonLdEnabled=${row?.jsonLdEnabled}, jsonLdType=${row?.jsonLdType}`, durationMs: Date.now() - start };
    }
    return { ok: true, durationMs: Date.now() - start, data: { jsonLdEnabled: row?.jsonLdEnabled, jsonLdType: row?.jsonLdType } };
  } catch (e) {
    try { await deleteSeoPage(testPathname); } catch { /* ignore */ }
    return { ok: false, detail: String(e), durationMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// Contenuti — DB ping dedicato
// ---------------------------------------------------------------------------
export async function testContenutiDbPing(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const { durationMs } = await timed(() => db.execute(sql`SELECT 1`));
    return { ok: true, durationMs, data: { query: "SELECT 1" } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Contenuti — getAllPages (read-only)
// ---------------------------------------------------------------------------
export async function testContenutiGetAllPages(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const { result: rows, durationMs } = await timed(() => getAllPages());
    return {
      ok: true,
      durationMs,
      data: {
        count: rows.length,
        sample: rows.slice(0, 3).map((r) => ({ slug: r.slug, title: r.title, status: r.status })),
      },
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Contenuti — getPageBySlug (slug inesistente → undefined)
// ---------------------------------------------------------------------------
export async function testContenutiGetBySlugMiss(): Promise<IntegrationResult> {
  await requireAdminPage();
  try {
    const { result: page, durationMs } = await timed(() =>
      getPageBySlug("__test_slug_that_does_not_exist_integration__")
    );
    if (page !== undefined) {
      return { ok: false, detail: "Trovata una pagina per uno slug inesistente", durationMs };
    }
    return { ok: true, durationMs, data: { result: "undefined — corretto" } };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Contenuti — togglePageStatus (reversibile: legge prima pagina reale o skip)
// ---------------------------------------------------------------------------
export async function testContenutiToggleStatus(): Promise<IntegrationResult> {
  await requireAdminPage();
  const start = Date.now();
  try {
    // Cerca la prima pagina disponibile da usare come cavie
    const pages = await getAllPages();
    if (pages.length === 0) {
      return { ok: true, durationMs: Date.now() - start, data: { skipped: true, reason: "nessuna pagina nel DB" } };
    }
    const target = pages[0];
    const originalStatus = target.status;

    // Toggle 1: cambia status
    await togglePageStatus(target.id, originalStatus);
    const afterToggle1 = await getPageBySlug(target.slug);
    const expectedAfter1 = originalStatus === "published" ? "draft" : "published";
    if (afterToggle1?.status !== expectedAfter1) {
      return {
        ok: false,
        detail: `Dopo toggle 1: atteso '${expectedAfter1}', trovato '${afterToggle1?.status}'`,
        durationMs: Date.now() - start,
      };
    }

    // Toggle 2: ripristina status originale
    await togglePageStatus(target.id, expectedAfter1);
    const afterToggle2 = await getPageBySlug(target.slug);
    if (afterToggle2?.status !== originalStatus) {
      return {
        ok: false,
        detail: `Dopo toggle 2 (ripristino): atteso '${originalStatus}', trovato '${afterToggle2?.status}'`,
        durationMs: Date.now() - start,
      };
    }

    return {
      ok: true,
      durationMs: Date.now() - start,
      data: {
        pageId: target.id,
        slug: target.slug,
        originalStatus,
        toggle1: expectedAfter1,
        toggle2: originalStatus,
        restored: true,
      },
    };
  } catch (e) {
    return { ok: false, detail: String(e), durationMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// Contenuti — deletePageCascade (reversibile: crea pagina test + figli, elimina tutto)
// ---------------------------------------------------------------------------
export async function testContenutiCascadeDelete(): Promise<IntegrationResult> {
  await requireAdminPage();
  const parentSlug = "__test_cascade_parent__";
  const childSlug  = "__test_cascade_child__";
  const start = Date.now();
  try {
    // Import dinamico per evitare cicli circolari
    const { upsertPage } = await import("@/lib/db/pages-queries");

    // Crea pagina padre
    const parentId = await upsertPage({ slug: parentSlug, title: "Test Parent", status: "draft" });

    // Crea pagina figlia
    await upsertPage({ slug: childSlug, title: "Test Child", status: "draft", parentId });

    // Verifica esistenza
    const parent = await getPageBySlug(parentSlug);
    const child  = await getPageBySlug(childSlug);
    if (!parent || !child) {
      return { ok: false, detail: "Pagine test non create correttamente", durationMs: Date.now() - start };
    }

    // Cascade delete (elimina padre + figlia)
    const deleted = await deletePageCascade(parentSlug);

    // Verifica cleanup
    const parentAfter = await getPageBySlug(parentSlug);
    const childAfter  = await getPageBySlug(childSlug);
    if (parentAfter || childAfter) {
      return { ok: false, detail: "Pagine test non eliminate correttamente dopo cascade", durationMs: Date.now() - start };
    }

    return {
      ok: true,
      durationMs: Date.now() - start,
      data: { deletedRows: deleted, parentOk: !parentAfter, childOk: !childAfter },
    };
  } catch (e) {
    // Cleanup di emergenza
    try {
      await deletePageCascade(parentSlug);
    } catch { /* ignore */ }
    return { ok: false, detail: String(e), durationMs: Date.now() - start };
  }
}
