/**
 * disposable-domains.ts
 *
 * Verifica se un dominio email è usa-e-getta.
 * I domini sono gestiti tramite la tabella `disposable_domains` su Supabase
 * e amministrabili dalle Impostazioni → SignIn → Domini bloccati.
 *
 * Cache in-memory: la lista viene caricata dal DB una volta ogni 5 minuti
 * per evitare una query a ogni registrazione.
 */

import { db } from "@/lib/db/drizzle";
import { disposableDomains } from "@/lib/db/schema";

let _cache: Set<string> | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti

async function loadDomains(): Promise<Set<string>> {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL_MS) return _cache;

  const rows = await db.select({ domain: disposableDomains.domain }).from(disposableDomains);
  _cache = new Set(rows.map((r) => r.domain.toLowerCase()));
  _cacheTime = now;
  return _cache;
}

/** Invalida la cache (chiamare dopo add/remove da Settings) */
export function invalidateDisposableDomainsCache(): void {
  _cache = null;
  _cacheTime = 0;
}

export async function isDisposableDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  const domains = await loadDomains();
  return domains.has(domain);
}
