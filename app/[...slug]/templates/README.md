# Template CMS — Routing automatico

Ogni file in questa cartella corrisponde a un template creato nel pannello admin.

## Convenzione di naming

| Slug template nel CMS | File da creare |
|---|---|
| `articolo` | `ArticoloTemplate.tsx` |
| `articolo-blog` | `ArticoloBlogTemplate.tsx` |
| `landing-page` | `LandingPageTemplate.tsx` |
| `scheda-prodotto` | `SchedaProdottoTemplate.tsx` |

Lo slug viene convertito in **PascalCase** + suffisso `Template`.

## Come creare un nuovo template

1. Crea il template nel pannello admin (`/admin/template`) con lo slug desiderato
2. Crea il file `{PascalCase}Template.tsx` in questa cartella
3. Esporta un componente React come `default` che accetta `CmsTemplateProps`
4. Il routing lo rileva automaticamente — nessuna modifica a `page.tsx`

## Struttura del componente

```tsx
import type { CmsTemplateProps } from "../page";

export default function ArticoloTemplate({
  page,
  template,
  resolvedContent,
  settings,
}: CmsTemplateProps) {
  // I campi custom definiti nel template sono in:
  const custom = JSON.parse(page.customFields ?? "{}");
  // es. custom.autore, custom.immagine, custom.categoria

  // Il contenuto TipTap (HTML) è in resolvedContent
  // I valori del styleConfig del template sono in:
  const style = JSON.parse(template?.styleConfig ?? "{}");

  return (
    <main>
      <h1>{page.title}</h1>
      {custom.autore && <p>di {custom.autore}</p>}
      <div dangerouslySetInnerHTML={{ __html: resolvedContent }} />
    </main>
  );
}
```

## Fallback

Se il file non viene trovato (template creato nel CMS ma nessun file `.tsx`),
viene usato automaticamente `DefaultTemplate.tsx` senza errori.
