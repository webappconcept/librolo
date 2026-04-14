import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema locale — replica esatta dello schema in actions.ts
// Testato in isolamento senza importare la Server Action
// ---------------------------------------------------------------------------
const schema = z.object({
  id: z.string().optional(),
  originalSlug: z.string().optional(),
  slug: z
    .string()
    .min(1, 'Lo slug è obbligatorio')
    .max(255)
    .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/, {
      message: 'Slug non valido: usa solo lettere minuscole, numeri, trattini e slash',
    }),
  title: z.string().min(1, 'Il titolo è obbligatorio').max(255),
  content: z.string().default(''),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  parentId: z.string().optional(),
  templateId: z.string().optional(),
  customFields: z.string().optional(),
  pageType: z.string().optional(),
  sortOrder: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Mock dipendenze Server Actions
// ---------------------------------------------------------------------------
const mockUpsertPage        = vi.fn()
const mockDeletePageCascade = vi.fn()
const mockTogglePageStatus  = vi.fn()
const mockGetPageBySlug     = vi.fn()
const mockUpsertRedirect    = vi.fn()
const mockGetSeoPage        = vi.fn()
const mockRenameSeoPage     = vi.fn()
const mockDeleteSeoPage     = vi.fn()
const mockLogContentActivity = vi.fn()
const mockGetUser           = vi.fn()
const mockRevalidatePath    = vi.fn()

vi.mock('@/lib/db/pages-queries', () => ({
  upsertPage:         mockUpsertPage,
  deletePageCascade:  mockDeletePageCascade,
  togglePageStatus:   mockTogglePageStatus,
  getPageBySlug:      mockGetPageBySlug,
}))
vi.mock('@/lib/db/redirects-queries', () => ({ upsertRedirect: mockUpsertRedirect }))
vi.mock('@/lib/db/seo-queries', () => ({
  getSeoPage:    mockGetSeoPage,
  renameSeoPage: mockRenameSeoPage,
  deleteSeoPage: mockDeleteSeoPage,
}))
vi.mock('@/lib/db/content-activity', () => ({ logContentActivity: mockLogContentActivity }))
vi.mock('@/lib/db/queries',          () => ({ getUser: mockGetUser }))
vi.mock('next/cache',                () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('server-only',               () => ({}))

// ---------------------------------------------------------------------------
// SECTION 1 — Validazione schema Zod
// ---------------------------------------------------------------------------
describe('Schema contenuti — validazione slug', () => {
  const base = { slug: 'test-pagina', title: 'Titolo' }

  it('accetta slug semplice lowercase', () => {
    expect(schema.safeParse(base).success).toBe(true)
  })

  it('accetta slug con trattino', () => {
    expect(schema.safeParse({ ...base, slug: 'pagina-uno' }).success).toBe(true)
  })

  it('accetta slug con slash (percorso annidato)', () => {
    expect(schema.safeParse({ ...base, slug: 'sezione/pagina' }).success).toBe(true)
  })

  it('accetta slug con numeri', () => {
    expect(schema.safeParse({ ...base, slug: 'pagina-2024' }).success).toBe(true)
  })

  it('rifiuta slug con lettere maiuscole', () => {
    const r = schema.safeParse({ ...base, slug: 'Pagina' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toContain('Slug non valido')
  })

  it('rifiuta slug con spazi', () => {
    const r = schema.safeParse({ ...base, slug: 'pagina uno' })
    expect(r.success).toBe(false)
  })

  it('rifiuta slug con underscore', () => {
    const r = schema.safeParse({ ...base, slug: 'pagina_uno' })
    expect(r.success).toBe(false)
  })

  it('rifiuta slug vuoto', () => {
    const r = schema.safeParse({ ...base, slug: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Lo slug è obbligatorio')
  })

  it('rifiuta slug che inizia con trattino', () => {
    const r = schema.safeParse({ ...base, slug: '-pagina' })
    expect(r.success).toBe(false)
  })

  it('rifiuta slug che inizia con slash', () => {
    const r = schema.safeParse({ ...base, slug: '/pagina' })
    expect(r.success).toBe(false)
  })
})

describe('Schema contenuti — altri campi', () => {
  const base = { slug: 'test', title: 'Titolo' }

  it('rifiuta title vuoto', () => {
    const r = schema.safeParse({ ...base, title: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Il titolo è obbligatorio')
  })

  it('status default è draft', () => {
    const r = schema.safeParse(base)
    expect(r.success).toBe(true)
    expect(r.data?.status).toBe('draft')
  })

  it('accetta status published', () => {
    const r = schema.safeParse({ ...base, status: 'published' })
    expect(r.success).toBe(true)
    expect(r.data?.status).toBe('published')
  })

  it('rifiuta status non valido', () => {
    const r = schema.safeParse({ ...base, status: 'archived' })
    expect(r.success).toBe(false)
  })

  it('content default è stringa vuota', () => {
    const r = schema.safeParse(base)
    expect(r.data?.content).toBe('')
  })

  it('accetta campi opzionali assenti', () => {
    const r = schema.safeParse(base)
    expect(r.success).toBe(true)
    expect(r.data?.parentId).toBeUndefined()
    expect(r.data?.templateId).toBeUndefined()
    expect(r.data?.customFields).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// SECTION 2 — Server Actions
// ---------------------------------------------------------------------------
describe('upsertPageAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetUser.mockResolvedValue({ id: 1 })
    mockLogContentActivity.mockResolvedValue(undefined)
    mockRevalidatePath.mockReturnValue(undefined)
  })

  it('ritorna error se slug mancante', async () => {
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('title', 'Titolo')
    // slug assente → zod fallisce
    const result = await upsertPageAction(undefined, fd)
    expect(result.error).toBeDefined()
    expect(result.success).toBeUndefined()
  })

  it('ritorna error se slug non valido (maiuscole)', async () => {
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('slug', 'Pagina-Invalid')
    fd.append('title', 'Titolo')
    const result = await upsertPageAction(undefined, fd)
    expect(result.error).toContain('Slug non valido')
  })

  it('ritorna error se title mancante', async () => {
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('slug', 'pagina-ok')
    // title assente
    const result = await upsertPageAction(undefined, fd)
    expect(result.error).toBeDefined()
  })

  it('crea nuova pagina e ritorna success + createdId', async () => {
    mockUpsertPage.mockResolvedValue(42)
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('slug', 'nuova-pagina')
    fd.append('title', 'Nuova Pagina')
    const result = await upsertPageAction(undefined, fd)
    expect(result.success).toBe(true)
    expect(result.createdId).toBe(42)
    expect(mockUpsertPage).toHaveBeenCalledOnce()
  })

  it('aggiorna pagina esistente (id presente) senza createdId', async () => {
    mockUpsertPage.mockResolvedValue(10)
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('id', '10')
    fd.append('slug', 'pagina-esistente')
    fd.append('title', 'Titolo aggiornato')
    const result = await upsertPageAction(undefined, fd)
    expect(result.success).toBe(true)
    expect(result.createdId).toBeUndefined()
  })

  it('imposta publishedAt=now se status=published e publishedAt assente', async () => {
    mockUpsertPage.mockResolvedValue(5)
    const before = Date.now()
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('slug', 'pub-pagina')
    fd.append('title', 'Pubblicata')
    fd.append('status', 'published')
    await upsertPageAction(undefined, fd)
    const call = mockUpsertPage.mock.calls[0][0]
    expect(call.publishedAt).toBeInstanceOf(Date)
    expect(call.publishedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('crea redirect 301 se lo slug è cambiato', async () => {
    mockUpsertPage.mockResolvedValue(7)
    mockGetSeoPage.mockResolvedValue(null)
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('id', '7')
    fd.append('originalSlug', 'vecchio-slug')
    fd.append('slug', 'nuovo-slug')
    fd.append('title', 'Titolo')
    await upsertPageAction(undefined, fd)
    expect(mockUpsertRedirect).toHaveBeenCalledWith({
      fromPath: '/vecchio-slug',
      toPath: '/nuovo-slug',
      statusCode: 301,
    })
  })

  it('rinomina SEO se slug cambiato e SEO esiste', async () => {
    mockUpsertPage.mockResolvedValue(8)
    const fakeSeo = { pathname: '/vecchio', label: 'Vecchio', updatedAt: new Date() }
    mockGetSeoPage.mockResolvedValue(fakeSeo)
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('id', '8')
    fd.append('originalSlug', 'vecchio')
    fd.append('slug', 'nuovo')
    fd.append('title', 'Titolo')
    await upsertPageAction(undefined, fd)
    expect(mockRenameSeoPage).toHaveBeenCalledWith('/vecchio', expect.objectContaining({
      pathname: '/nuovo',
      label: 'Titolo',
    }))
  })

  it('ritorna error se upsertPage lancia eccezione', async () => {
    mockUpsertPage.mockRejectedValue(new Error('DB error'))
    const { upsertPageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const fd = new FormData()
    fd.append('slug', 'pagina-ok')
    fd.append('title', 'Titolo')
    const result = await upsertPageAction(undefined, fd)
    expect(result.error).toBe('Errore nel salvataggio. Riprova.')
  })
})

describe('deletePageAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetUser.mockResolvedValue({ id: 1 })
    mockLogContentActivity.mockResolvedValue(undefined)
    mockRevalidatePath.mockReturnValue(undefined)
  })

  it('ritorna error se slug è stringa vuota', async () => {
    const { deletePageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const result = await deletePageAction('')
    expect(result.error).toBe('Slug mancante')
  })

  it('elimina pagina e ritorna success + deleted count', async () => {
    mockDeletePageCascade.mockResolvedValue(1)
    mockDeleteSeoPage.mockResolvedValue(undefined)
    const { deletePageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const result = await deletePageAction('pagina-da-eliminare')
    expect(result.success).toBe(true)
    expect(result.deleted).toBe(1)
    expect(mockDeletePageCascade).toHaveBeenCalledWith('pagina-da-eliminare')
    expect(mockDeleteSeoPage).toHaveBeenCalledWith('/pagina-da-eliminare')
  })

  it('ritorna error se deletePageCascade lancia eccezione', async () => {
    mockDeletePageCascade.mockRejectedValue(new Error('DB error'))
    const { deletePageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const result = await deletePageAction('pagina-ok')
    expect(result.error).toBe("Errore nell'eliminazione. Riprova.")
  })

  it('logga PAGE_DELETED con lo slug corretto', async () => {
    mockDeletePageCascade.mockResolvedValue(1)
    mockDeleteSeoPage.mockResolvedValue(undefined)
    const { deletePageAction } = await import('@/app/(admin)/admin/contenuti/actions')
    await deletePageAction('mia-pagina')
    expect(mockLogContentActivity).toHaveBeenCalledWith(
      expect.anything(),
      'slug: /mia-pagina',
      1,
    )
  })
})

describe('togglePageStatusAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetUser.mockResolvedValue({ id: 1 })
    mockLogContentActivity.mockResolvedValue(undefined)
    mockRevalidatePath.mockReturnValue(undefined)
  })

  it('ritorna success se toggle va a buon fine', async () => {
    mockTogglePageStatus.mockResolvedValue(undefined)
    const { togglePageStatusAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const result = await togglePageStatusAction(5, 'draft')
    expect(result.success).toBe(true)
    expect(mockTogglePageStatus).toHaveBeenCalledWith(5, 'draft')
  })

  it('logga PAGE_PUBLISHED se il nuovo stato è published', async () => {
    mockTogglePageStatus.mockResolvedValue(undefined)
    const { togglePageStatusAction } = await import('@/app/(admin)/admin/contenuti/actions')
    await togglePageStatusAction(5, 'draft') // draft → published
    expect(mockLogContentActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('published'),
      1,
    )
  })

  it('logga PAGE_UNPUBLISHED se il nuovo stato è draft', async () => {
    mockTogglePageStatus.mockResolvedValue(undefined)
    const { togglePageStatusAction } = await import('@/app/(admin)/admin/contenuti/actions')
    await togglePageStatusAction(5, 'published') // published → draft
    expect(mockLogContentActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('draft'),
      1,
    )
  })

  it('ritorna error se togglePageStatus lancia eccezione', async () => {
    mockTogglePageStatus.mockRejectedValue(new Error('DB error'))
    const { togglePageStatusAction } = await import('@/app/(admin)/admin/contenuti/actions')
    const result = await togglePageStatusAction(5, 'draft')
    expect(result.error).toBe('Errore nel cambio stato. Riprova.')
  })
})
