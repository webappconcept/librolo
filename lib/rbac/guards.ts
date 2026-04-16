// lib/rbac/guards.ts
import { getUser } from "@/lib/db/queries";
import type { UserWithProfile } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac/can";
import "server-only";

/** true se l'utente è il super admin (flag di emergenza, bypassa RBAC) */
export function isAdmin(user: UserWithProfile): boolean {
  return user.isAdmin === true;
}

async function hasAdminAccess(user: UserWithProfile): Promise<boolean> {
  if (user.isAdmin) return true;
  return can(user, "admin:access");
}

// ---------------------------------------------------------------------------
// Server Action guards — lanciano eccezione
// ---------------------------------------------------------------------------

export async function requireAdmin(): Promise<UserWithProfile> {
  const user = await getUser();
  if (!user) throw new Error("Non autenticato");
  const ok = await hasAdminAccess(user);
  if (!ok) throw new Error("Non autorizzato");
  return user;
}

// ---------------------------------------------------------------------------
// Page guards — redirect
// ---------------------------------------------------------------------------

export async function requireAdminPage(): Promise<UserWithProfile> {
  const user = await getUser();
  if (!user) redirect("/admin/sign-in");

  const ok = await hasAdminAccess(user);
  if (!ok) redirect("/admin/sign-in");

  return user;
}

export async function requireAdminSectionPage(
  permissionKey: string,
): Promise<UserWithProfile> {
  const user = await getUser();
  if (!user) redirect("/admin/sign-in");

  if (user.isAdmin) return user;

  const hasAdmin = await can(user, "admin:access");
  if (!hasAdmin) redirect("/admin/sign-in");

  const hasSection = await can(user, permissionKey);
  if (!hasSection) redirect("/admin");

  return user;
}
