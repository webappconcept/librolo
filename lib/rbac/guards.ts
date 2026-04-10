// lib/rbac/guards.ts
// Guard centralizzati per i controlli di accesso.
//
// Architettura:
//  - Ruoli di sistema: solo "admin" e "member".
//  - Tutti gli altri accessi si gestiscono tramite permessi RBAC.
//
// Livelli di verifica per /admin:
//  1. Edge middleware (middleware.ts)  — verifica cookie/JWT, no DB
//  2. requireAdminPage()              — verifica RBAC reale con DB (gate ingresso)
//  3. requireAdminSectionPage()       — verifica permesso specifico della sezione
//
// Logica accesso admin (OR):
//  - user.isAdmin === true  → super admin, BYPASSA il sistema RBAC (fallback di emergenza)
//  - permesso RBAC "admin:access" assegnato al ruolo  → accesso via matrice
//
// Esempio per proteggere una sezione specifica:
//   const user = await requireAdminSectionPage("admin:contenuti");
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
 * Gate di ingresso per tutto /admin. Usa in layout.tsx principale.
 */
export async function requireAdminPage(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/admin/sign-in");

  const ok = await hasAdminAccess(user);
  if (!ok) redirect("/admin/sign-in");

  return user;
}

/**
 * Guard per sezione specifica dell'admin.
 * Redirige a /admin (dashboard) se l'utente è loggato ma non ha il permesso
 * per questa sezione. Redirige a /admin/sign-in se non autenticato.
 *
 * Usare nel layout.tsx o page.tsx di ogni sezione admin:
 * @example
 * // app/(admin)/admin/contenuti/layout.tsx
 * export default async function ContenutoLayout({ children }) {
 *   await requireAdminSectionPage("admin:contenuti");
 *   return <>{children}</>;
 * }
 */
export async function requireAdminSectionPage(permissionKey: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/admin/sign-in");

  // Super admin bypassa tutto
  if (user.isAdmin) return user;

  // Verifica prima che abbia accesso admin in generale
  const hasAdmin = await can(user, "admin:access");
  if (!hasAdmin) redirect("/admin/sign-in");

  // Verifica permesso specifico della sezione
  const hasSection = await can(user, permissionKey);
  if (!hasSection) redirect("/admin");

  return user;
}
