// lib/rbac/guards.ts
// Guard centralizzati per i controlli di accesso.
//
// Architettura:
//  - Ruoli di sistema: solo "admin" e "member".
//  - Tutti gli altri accessi si gestiscono tramite permessi RBAC.
//
// Livelli di verifica per /admin:
//  1. Edge middleware (middleware.ts)  — verifica cookie/JWT, no DB
//  2. requireAdminPage()              — verifica RBAC reale con DB
//
// Logica accesso admin (OR):
//  - user.isAdmin === true  → super admin, BYPASSA il sistema RBAC (fallback di emergenza)
//  - permesso RBAC "admin:access" assegnato al ruolo  → accesso via matrice
//
// Per proteggere route specifiche usare requirePermission() da can.ts
// invece di creare nuovi guard isStaff / isEditor / ecc.
import { getUser } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac/can";
import "server-only";

/** true se l'utente è il super admin (flag di emergenza, bypassa RBAC) */
export function isAdmin(user: User): boolean {
  return user.isAdmin === true;
}

/**
 * Controlla accesso admin:
 *  - is_admin flag  → super admin, sempre autorizzato
 *  - permesso RBAC "admin:access"  → ruolo personalizzato con accesso admin
 */
async function hasAdminAccess(user: User): Promise<boolean> {
  if (user.isAdmin) return true;
  return can(user, "admin:access");
}

// ---------------------------------------------------------------------------
// Server Action guards — lanciano eccezione
// ---------------------------------------------------------------------------

/**
 * Guard per Server Action — lancia eccezione se non admin.
 * Uso: const user = await requireAdmin();
 */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  if (!user) throw new Error("Non autenticato");
  const ok = await hasAdminAccess(user);
  if (!ok) throw new Error("Non autorizzato");
  return user;
}

// ---------------------------------------------------------------------------
// Page guards — redirect
// ---------------------------------------------------------------------------

/**
 * Page guard — redirige a /admin/sign-in se non admin (RBAC-aware).
 * Usa in async page components o layout.
 */
export async function requireAdminPage(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/admin/sign-in");

  const ok = await hasAdminAccess(user);
  if (!ok) redirect("/admin/sign-in");

  return user;
}
