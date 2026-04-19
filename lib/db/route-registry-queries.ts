import { db } from "@/lib/db/drizzle";
import { routeRegistry } from "@/lib/db/schema";
import type { RouteRegistry, NewRouteRegistry, RouteVisibility } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Cache in-memory — evita una query al DB per ogni request del middleware.
// TTL di 60s: sufficiente per la produzione, abbastanza breve da
// riflettere modifiche fatte dall'admin senza dover riavviare il server.
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
// Lettura — tutte le route attive (usata dal middleware + SEO + sitemap)
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

/** Tutte le route (attive + disattive) — solo per il pannello admin */
export async function getAllRoutes(): Promise<RouteRegistry[]> {
  return db
    .select()
    .from(routeRegistry)
    .orderBy(asc(routeRegistry.pathname));
}

/** Route filtrate per visibilità */
export async function getRoutesByVisibility(
  visibility: RouteVisibility,
): Promise<RouteRegistry[]> {
  const all = await getActiveRoutes();
  return all.filter((r) => r.visibility === visibility);
}

/** Route pubbliche — usate dal proxy e dalla sitemap */
export async function getPublicRoutes(): Promise<RouteRegistry[]> {
  return getRoutesByVisibility("public");
}

/** Route private — usate dal proxy per richiedere auth */
export async function getPrivateRoutes(): Promise<RouteRegistry[]> {
  return getRoutesByVisibility("private");
}

/** Route auth-only — usate dal proxy (/sign-in, /sign-up, ecc.) */
export async function getAuthOnlyRoutes(): Promise<RouteRegistry[]> {
  return getRoutesByVisibility("auth-only");
}

/** Route da mostrare nella nav pubblica */
export async function getNavRoutes(): Promise<RouteRegistry[]> {
  const all = await getActiveRoutes();
  return all.filter((r) => r.inNav);
}

/** Route da mostrare nel footer */
export async function getFooterRoutes(): Promise<RouteRegistry[]> {
  const all = await getActiveRoutes();
  return all.filter((r) => r.inFooter);
}

/** Route da includere nella sitemap */
export async function getSitemapRoutes(): Promise<RouteRegistry[]> {
  const all = await getActiveRoutes();
  return all.filter((r) => r.inSitemap);
}

/** Singola route per pathname — usata dalla pagina SEO meta-tags */
export async function getRouteByPathname(
  pathname: string,
): Promise<RouteRegistry | undefined> {
  const all = await getActiveRoutes();
  return all.find((r) => r.pathname === pathname);
}

// ---------------------------------------------------------------------------
// Scrittura — usate dalle server actions del pannello admin.
// Ogni mutazione invalida la cache.
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

export async function updateRoute(
  id: string,
  data: Partial<Omit<NewRouteRegistry, "id" | "createdAt" | "updatedAt">>,
): Promise<RouteRegistry | undefined> {
  const [row] = await db
    .update(routeRegistry)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(routeRegistry.id, id))
    .returning();
  invalidateRouteRegistryCache();
  return row;
}

export async function deleteRoute(id: string): Promise<void> {
  await db.delete(routeRegistry).where(eq(routeRegistry.id, id));
  invalidateRouteRegistryCache();
}

/** Attiva / disattiva una route senza eliminarla */
export async function toggleRouteActive(
  id: string,
  isActive: boolean,
): Promise<RouteRegistry | undefined> {
  return updateRoute(id, { isActive });
}
