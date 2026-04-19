import { db } from "@/lib/db/drizzle";
import { routeRegistry } from "@/lib/db/schema";
import type { RouteRegistry, NewRouteRegistry, RouteVisibility } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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

export async function toggleRouteActive(
  id: string,
  isActive: boolean,
): Promise<RouteRegistry | undefined> {
  return updateRoute(id, { isActive });
}
