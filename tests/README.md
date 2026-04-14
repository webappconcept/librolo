# 🧪 Librolo — Test Suite con Vitest

Questo progetto usa **Vitest** come test runner, integrato con:
- `@testing-library/react` per i component test
- `jsdom` come ambiente DOM simulato
- `@vitest/coverage-v8` per il coverage report

---

## Struttura dei test

```
tests/
├── setup.ts              # Setup globale: mock di next/navigation, next/headers, fetch
├── lib/
│   ├── utils.test.ts     # Test funzioni utility (slug, validazione, string)
│   ├── auth.test.ts      # Test logica autenticazione
│   └── books.test.ts     # Test domain logic libri/capitoli
├── components/
│   └── ui-smoke.test.tsx # Smoke test componenti UI
├── api/
│   └── health.test.ts    # Test helpers API route
└── README.md
```

---

## Comandi

```bash
# Esegui tutti i test
pnpm test

# Watch mode (sviluppo — riesegue al salvataggio)
pnpm test:watch

# Coverage report
pnpm test:coverage

# UI interattiva (browser)
pnpm test:ui
```

---

## Come aggiungere un nuovo test

1. Crea un file `*.test.ts` o `*.test.tsx` nella cartella appropriata
2. Importa `describe`, `it`, `expect` da `vitest`
3. Per componenti React, usa `@testing-library/react`
4. Per funzioni server-side, mocka con `vi.mock()`

**Esempio minimo:**
```ts
import { describe, it, expect } from 'vitest'

describe('la mia funzione', () => {
  it('ritorna il valore corretto', () => {
    expect(1 + 1).toBe(2)
  })
})
```

---

## Convenzioni

- Un test = una responsabilità sola
- Nomi in italiano per leggibilità del team
- Mock del DB sempre in `beforeEach` con `vi.clearAllMocks()`
- Test sui componenti: preferire query semantiche (`getByRole`, `getByLabelText`)
- Non testare implementazione, testare **comportamento**

---

## Coverage target

| Area | Target |
|------|--------|
| `lib/` | > 80% |
| `components/` | > 60% (smoke) |
| `app/api/` | > 70% |

Esegui `pnpm test:coverage` e apri `coverage/index.html` per il report visuale.
