import { db } from "@/lib/db/drizzle";
import { routeRegistry } from "@/lib/db/schema";
import type { RouteRegistry, NewRouteRegistry, RouteVisibility } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Cache in-memory (TTL 60s)
// ---------------------------------------------------------------------------

let _cache: RouteRegistry[] | null = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 60_000;

function isCacheValid() {
  return _cache !== null && Date.now() - _cacheAt < CACHE_TTL_MS;
}

export function invalidateRouteRegistryCache() {
  _cache = null;
  _cacheAt = 0;
}

// ---------------------------------------------------------------------------
// Campi protetti per le system routes
// pathname e visibility NON possono essere modificati dall'admin.
// Tutti gli altri campi (label, isActive, ecc.) rimangono editabili.
// ---------------------------------------------------------------------------

export const SYSTEM_ROUTE_PROTECTED_FIELDS = ["pathname", "visibility"] as const;
export type SystemRouteProtectedField = (typeof SYSTEM_ROUTE_PROTECTED_FIELDS)[number];

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getActiveRoutes(): Promise<RouteRegistry[]> {
  if (isCacheValid()) return _cache!;
  const rows = await db
    .select()
    .from(routeRegistry)
    .where(eq(routeRegistry.isActive, true))
    .orderBy(asc(routeRegistry.pathname));
  _cache = rows;
  _cacheAt = Date.now();
  return rows;
}

export async function getAllRoutes(): Promise<RouteRegistry[]> {
  return db
    .select()
    .from(routeRegistry)
    .orderBy(asc(routeRegistry.pathname));
}

export async function getRoutesByVisibility(
  visibility: RouteVisibility,
): Promise<RouteRegistry[]> {
  const all = await getActiveRoutes();
  return all.filter((r) => r.visibility === visibility);
}

export async function getPublicRoutes(): Promise<RouteRegistry[]> {
  return getRoutesByVisibility("public");
}

export async function getPrivateRoutes(): Promise<RouteRegistry[]> {
  return getRoutesByVisibility("private");
}

export async function getAuthOnlyRoutes(): Promise<RouteRegistry[]> {
  return getRoutesByVisibility("auth-only");
}

export async function getRouteByPathname(
  pathname: string,
): Promise<RouteRegistry | undefined> {
  const all = await getActiveRoutes();
  return all.find((r) => r.pathname === pathname);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function createRoute(
  data: Omit<NewRouteRegistry, "id" | "createdAt" | "updatedAt">,
): Promise<RouteRegistry> {
  const [row] = await db
    .insert(routeRegistry)
    .values(data)
    .returning();
  invalidateRouteRegistryCache();
  return row;
}

/**
 * Aggiorna una route.
 *
 * Per le route di sistema (isSystemRoute = true) i campi `pathname`
 * e `visibility` sono protetti e vengono silenziosamente ignorati
 * anche se presenti nel payload. Tutti gli altri campi sono editabili
 * (label, isActive, ecc.).
 *
 * Per le route non-system tutti i campi sono modificabili.
 */
export async function updateRoute(
  id: string,
  data: Partial<Omit<NewRouteRegistry, "id" | "createdAt" | "updatedAt">>,
): Promise<RouteRegistry | undefined> {
  // Carica il record per verificare se è una system route
  const [existing] = await db
    .select()
    .from(routeRegistry)
    .where(eq(routeRegistry.id, id));

  if (!existing) return undefined;

  let payload = { ...data, updatedAt: new Date() };

  // Rimuove i campi protetti per le system routes
  if (existing.isSystemRoute) {
    for (const field of SYSTEM_ROUTE_PROTECTED_FIELDS) {
      delete (payload as Record<string, unknown>)[field];
    }
  }

  const [row] = await db
    .update(routeRegistry)
    .set(payload)
    .where(eq(routeRegistry.id, id))
    .returning();

  invalidateRouteRegistryCache();
  return row;
}

/**
 * Elimina una route.
 * Lancia un errore se la route è di sistema (isSystemRoute = true).
 */
export async function deleteRoute(id: string): Promise<void> {
  const [row] = await db
    .select()
    .from(routeRegistry)
    .where(eq(routeRegistry.id, id));

  if (!row) return;

  if (row.isSystemRoute) {
    throw new Error("Le route di sistema non possono essere eliminate.");
  }

  await db.delete(routeRegistry).where(eq(routeRegistry.id, id));
  invalidateRouteRegistryCache();
}

export async function toggleRouteActive(
  id: string,
  isActive: boolean,
): Promise<RouteRegistry | undefined> {
  // toggleRouteActive usa updateRoute, che rispetta già le protezioni
  return updateRoute(id, { isActive });
}
