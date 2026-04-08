// lib/rbac/guards.ts
// Helper centralizzati per i controlli di accesso.
// Usa i flag booleani is_admin / is_staff invece della stringa role,
// così i ruoli custom non rompono i guard esistenti.
import { getUser } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";
import { redirect } from "next/navigation";
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
 * Server Action guard — lancia eccezione se non admin.
 * Uso: const user = await requireAdmin();
 */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  if (!user || !isAdmin(user)) {
    throw new Error("Non autorizzato");
  }
  return user;
}

/**
 * Server Action guard — lancia eccezione se non staff.
 */
export async function requireStaff(): Promise<User> {
  const user = await getUser();
  if (!user || !isStaff(user)) {
    throw new Error("Non autorizzato");
  }
  return user;
}

/**
 * Page guard — redirige se non admin.
 * Usa in async page components o layout.
 */
export async function requireAdminPage(): Promise<User> {
  const user = await getUser();
  if (!user || !isAdmin(user)) {
    redirect("/admin/sign-in");
  }
  return user;
}
