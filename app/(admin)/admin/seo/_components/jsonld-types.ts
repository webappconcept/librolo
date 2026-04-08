/**
 * Costanti JSON-LD in file separato per evitare import circular
 * tra actions.ts ("use server") e seo-manager.tsx ("use client").
 *
 * Next.js 16 con Turbopack può crashare il bundle client se un
 * "use client" component importa direttamente da un "use server" file.
 */

export const JSON_LD_TYPES = [
  "WebPage",
  "Article",
  "BlogPosting",
  "Product",
  "FAQPage",
  "BreadcrumbList",
  "Organization",
  "LocalBusiness",
  "Person",
  "Event",
  "VideoObject",
] as const;

export type JsonLdType = (typeof JSON_LD_TYPES)[number];
