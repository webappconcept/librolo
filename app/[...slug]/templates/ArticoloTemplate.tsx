// app/[...slug]/templates/ArticoloTemplate.tsx
// Template per le pagine di tipo "articolo".
// Slug DB atteso: "articolo"
// Registrato in: ./index.ts

import type { CmsTemplateProps } from "../page";

export default function ArticoloTemplate({
  page,
  template,
  resolvedContent,
}: CmsTemplateProps) {
  const custom = JSON.parse(page.customFields ?? "{}");
  const _style = JSON.parse(template?.styleConfig ?? "{}");

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
        {page.title}
      </h1>
      {custom.autore && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          di {custom.autore}
        </p>
      )}
      {resolvedContent ? (
        <div
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: resolvedContent }}
        />
      ) : (
        <p className="text-gray-500">Nessun contenuto disponibile.</p>
      )}
    </main>
  );
}
