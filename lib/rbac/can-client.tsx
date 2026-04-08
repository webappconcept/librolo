/**
 * RBAC — componenti e hook lato client
 *
 * Non importa mai da DB o server-only — riceve i permessi come prop/context.
 *
 * Componenti:
 *  - <CanGuard perm="key">  → mostra children solo se il permesso è presente
 *  - <CanAnyGuard perms={[]} → almeno uno
 *  - <CanAllGuard perms={[]} → tutti
 *
 * Hook:
 *  - usePermissions()       → Set<string> dal context (+ helper has/hasAny/hasAll)
 *
 * Setup:
 *  1. Nel layout Server Component, carica i permessi con getUserPermissions(user)
 *  2. Passa il Set serializzato (Array) a <PermissionsProvider permissions={array}>
 *  3. Usa <CanGuard> e usePermissions() nei Client Components figli
 */
"use client";

import { createContext, useContext, useMemo } from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type PermissionsContextValue = {
  /** Set dei permessi attivi dell'utente corrente */
  permissions: Set<string>;
  /** Controlla un singolo permesso */
  has: (key: string) => boolean;
  /** Controlla se ha almeno uno dei permessi */
  hasAny: (keys: string[]) => boolean;
  /** Controlla se ha tutti i permessi */
  hasAll: (keys: string[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: new Set(),
  has: () => false,
  hasAny: () => false,
  hasAll: () => false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Wrappa il layout con i permessi dell'utente.
 * Riceve un array di stringhe (serializzabile da Server Component).
 *
 * @example
 * // In app/layout.tsx (Server Component)
 * const perms = await getUserPermissions(user);
 * return (
 *   <PermissionsProvider permissions={Array.from(perms)}>
 *     {children}
 *   </PermissionsProvider>
 * );
 */
export function PermissionsProvider({
  permissions: permArray,
  children,
}: {
  permissions: string[];
  children: React.ReactNode;
}) {
  const value = useMemo<PermissionsContextValue>(() => {
    const set = new Set(permArray);
    return {
      permissions: set,
      has: (key) => set.has(key),
      hasAny: (keys) => keys.some((k) => set.has(k)),
      hasAll: (keys) => keys.every((k) => set.has(k)),
    };
  }, [permArray]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Accede ai permessi dell'utente corrente nel client.
 *
 * @example
 * const { has, hasAny } = usePermissions();
 * if (has("posts:publish")) { ... }
 */
export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}

// ---------------------------------------------------------------------------
// Guard components
// ---------------------------------------------------------------------------

type GuardProps = {
  /** Contenuto mostrato se autorizzato */
  children: React.ReactNode;
  /** Contenuto mostrato se NON autorizzato (default: null) */
  fallback?: React.ReactNode;
};

/**
 * Mostra children solo se l'utente ha il permesso specificato.
 *
 * @example
 * <CanGuard perm="posts:publish">
 *   <PublishButton />
 * </CanGuard>
 *
 * // Con fallback
 * <CanGuard perm="users:ban" fallback={<span>Non autorizzato</span>}>
 *   <BanButton />
 * </CanGuard>
 */
export function CanGuard({
  perm,
  children,
  fallback = null,
}: GuardProps & { perm: string }) {
  const { has } = usePermissions();
  return has(perm) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Mostra children se l'utente ha ALMENO UNO dei permessi.
 *
 * @example
 * <CanAnyGuard perms={["posts:edit", "posts:publish"]}>
 *   <EditBar />
 * </CanAnyGuard>
 */
export function CanAnyGuard({
  perms,
  children,
  fallback = null,
}: GuardProps & { perms: string[] }) {
  const { hasAny } = usePermissions();
  return hasAny(perms) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Mostra children solo se l'utente ha TUTTI i permessi.
 *
 * @example
 * <CanAllGuard perms={["posts:publish", "posts:feature"]}>
 *   <FeatureAndPublishButton />
 * </CanAllGuard>
 */
export function CanAllGuard({
  perms,
  children,
  fallback = null,
}: GuardProps & { perms: string[] }) {
  const { hasAll } = usePermissions();
  return hasAll(perms) ? <>{children}</> : <>{fallback}</>;
}
