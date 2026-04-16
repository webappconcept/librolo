/**
 * disposable-domains.ts
 *
 * Carica dinamicamente la lista dei domini usa-e-getta dal file JSON.
 * In questo modo il bundle principale non include 63KB di dati statici:
 * il JSON viene letto una sola volta al primo controllo, poi tenuto in memoria.
 *
 * Per aggiornare la lista: modifica lib/auth/disposable-domains.json
 *
 * Alternativa esterna (zero bundle):
 *   https://open.kickbox.com/v1/disposable/{domain}
 */

let _domains: Set<string> | null = null;

async function loadDomains(): Promise<Set<string>> {
  if (_domains) return _domains;
  const list = (await import("./disposable-domains.json")) as {
    default: string[];
  };
  _domains = new Set(list.default);
  return _domains;
}

export async function isDisposableDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  const domains = await loadDomains();
  return domains.has(domain);
}
