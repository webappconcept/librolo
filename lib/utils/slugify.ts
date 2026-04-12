/**
 * Genera uno slug sicuro da un nome umano.
 * "Articolo Blog" → "articolo-blog"
 * "FAQ & Servizi!" → "faq-servizi"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Converte uno slug in PascalCase per il nome file del template.
 * "articolo-blog" → "ArticoloBlog"
 */
export function slugToPascalCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}
