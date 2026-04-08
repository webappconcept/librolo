// lib/rbac/guards.ts
// Guard centralizzati per i controlli di accesso.
//
// Livelli di verifica per /admin:
//  1. Edge middleware (middleware.ts)  — verifica cookie/JWT, no DB
//  2. requireAdminPage()              — verifica RBAC reale con DB
//
// Logica di accesso admin (OR):
//  - user.isAdmin === true           (flag legacy, sempre valido)
//  - ruolo dell'utente ha il permesso "admin:access" nella tabella RBAC
//
// In questo modo i ruoli custom con permesso "admin:access" accedono
// al pannello senza dover impostare il flag is_admin manualmente.
import { getUser } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac/can";
import "server-only";

/** Restituisce true se l'utente ha il flag is_admin */
export function isAdmin(user: User): boolean {
  return user.isAdmin === true;
}

/** Restituisce true se l'utente ha il flag is_staff o is_admin */
export function isStaff(user: User): boolean {
  return user.isStaff === true || user.isAdmin === true;
}

/**
 * Controlla se l'utente può accedere al pannello admin.
 *
 * Regola (OR):
 *  - is_admin flag = true   (super admin, accesso sempre garantito)
 *  - permesso RBAC "admin:access" assegnato al suo ruolo o come override
 */
async function hasAdminAccess(user: User): Promise<boolean> {
  if (user.isAdmin) return true;
  return can(user, "admin:access");
}

// ---------------------------------------------------------------------------
// Server Action guards — lanciano eccezione
// ---------------------------------------------------------------------------

/**
 * Server Action guard — lancia eccezione se non admin.
 * Uso: const user = await requireAdmin();
 */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  if (!user) throw new Error("Non autenticato");
  const ok = await hasAdminAccess(user);
  if (!ok) throw new Error("Non autorizzato");
  return user;
}

/**
 * Server Action guard — lancia eccezione se non staff.
 */
export async function requireStaff(): Promise<User> {
  const user = await getUser();
  if (!user || !isStaff(user)) throw new Error("Non autorizzato");
  return user;
}

// ---------------------------------------------------------------------------
// Page guards — redirect
// ---------------------------------------------------------------------------

/**
 * Page guard — redirige se non admin (RBAC-aware).
 * Usa in async page components o layout.
 *
 * Controlla in ordine:
 *  1. Utente autenticato           → altrimenti redirect /admin/sign-in
 *  2. isAdmin flag OPPURE          → altrimenti redirect /admin/sign-in
 *     permesso RBAC "admin:access"
 */
export async function requireAdminPage(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/admin/sign-in");

  const ok = await hasAdminAccess(user);
  if (!ok) redirect("/admin/sign-in");

  return user;
}

/**
 * Page guard più permissivo — redirige se non staff.
 */
export async function requireStaffPage(): Promise<User> {
  const user = await getUser();
  if (!user || !isStaff(user)) redirect("/sign-in");
  return user;
}
