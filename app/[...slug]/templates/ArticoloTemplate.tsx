// app/[...slug]/templates/DefaultTemplate.tsx
// Template di fallback generico — usato quando nessun file specifico esiste per lo slug del template.
// Mostra titolo + contenuto TipTap con stile prose minimal.
// Personalizza questo file per cambiare l'aspetto di tutte le pagine senza template dedicato.

import type { CmsTemplateProps } from "../page";

export default function DefaultTemplate({
  page,
  resolvedContent,
}: CmsTemplateProps) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        <div>template articolo</div>
        {page.title}
      </h1>
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
