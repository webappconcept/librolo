import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema locali — repliche esatte degli schema in actions.ts
// ---------------------------------------------------------------------------
const ROBOTS_VALUES = ['', 'noindex,nofollow', 'noindex,follow'] as const

const seoSchema = z.object({
  pathname: z
    .string()
    .min(1)
    .regex(/^\//, { message: 'Il pathname deve iniziare con /' }),
  originalPathname: z.string().optional(),
  label: z.string().min(1, 'Il nome è obbligatorio').max(100),
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: z.string().url().optional().or(z.literal('')),
  robots: z
    .enum(ROBOTS_VALUES)
    .optional()
    .transform((v) => v || null),
  jsonLdEnabled: z.boolean().default(false),
  jsonLdType: z.string().optional().nullable(),
})

const robotsSchema = z.object({
  robots_txt: z.string().max(10000),
  humans_txt: z.string().max(10000),
})

// ---------------------------------------------------------------------------
// Mock dipendenze
// ---------------------------------------------------------------------------
const mockUpsertSeoPage  = vi.fn()
const mockRenameSeoPage  = vi.fn()
const mockDeleteSeoPage  = vi.fn()
const mockUpdateAppSetting = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@/lib/db/seo-queries', () => ({
  upsertSeoPage:  mockUpsertSeoPage,
  renameSeoPage:  mockRenameSeoPage,
  deleteSeoPage:  mockDeleteSeoPage,
}))
vi.mock('@/lib/db/settings-queries', () => ({ updateAppSetting: mockUpdateAppSetting }))
vi.mock('next/cache',   () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('server-only',  () => ({}))
// jsonld-types — evitiamo import del componente React
vi.mock('@/app/(admin)/admin/seo/_components/jsonld-types', () => ({
  JSON_LD_TYPES: ['Article', 'Product', 'FAQPage', 'BreadcrumbList'],
}))

// ---------------------------------------------------------------------------
// SECTION 1 — Validazione schema SEO (pathname + campi meta)
// ---------------------------------------------------------------------------
describe('Schema SEO — pathname', () => {
  const base = { pathname: '/pagina', label: 'Pagina' }

  it('accetta pathname che inizia con /', () => {
    expect(seoSchema.safeParse(base).success).toBe(true)
  })

  it('accetta pathname annidato', () => {
    expect(seoSchema.safeParse({ ...base, pathname: '/sezione/pagina' }).success).toBe(true)
  })

  it('rifiuta pathname senza / iniziale', () => {
    const r = seoSchema.safeParse({ ...base, pathname: 'pagina' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Il pathname deve iniziare con /')
  })

  it('rifiuta pathname vuoto', () => {
    const r = seoSchema.safeParse({ ...base, pathname: '' })
    expect(r.success).toBe(false)
  })
})

describe('Schema SEO — campi meta', () => {
  const base = { pathname: '/p', label: 'Label' }

  it('rifiuta label vuota', () => {
    const r = seoSchema.safeParse({ ...base, label: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Il nome è obbligatorio')
  })

  it('rifiuta title > 70 caratteri', () => {
    const r = seoSchema.safeParse({ ...base, title: 'a'.repeat(71) })
    expect(r.success).toBe(false)
  })

  it('accetta title esattamente 70 caratteri', () => {
    expect(seoSchema.safeParse({ ...base, title: 'a'.repeat(70) }).success).toBe(true)
  })

  it('rifiuta description > 160 caratteri', () => {
    const r = seoSchema.safeParse({ ...base, description: 'a'.repeat(161) })
    expect(r.success).toBe(false)
  })

  it('rifiuta ogDescription > 200 caratteri', () => {
    const r = seoSchema.safeParse({ ...base, ogDescription: 'a'.repeat(201) })
    expect(r.success).toBe(false)
  })

  it('accetta ogImage URL valido', () => {
    const r = seoSchema.safeParse({ ...base, ogImage: 'https://example.com/img.jpg' })
    expect(r.success).toBe(true)
  })

  it('accetta ogImage stringa vuota', () => {
    expect(seoSchema.safeParse({ ...base, ogImage: '' }).success).toBe(true)
  })

  it('rifiuta ogImage URL non valido', () => {
    const r = seoSchema.safeParse({ ...base, ogImage: 'not-a-url' })
    expect(r.success).toBe(false)
  })

  it('robots transform: stringa vuota → null', () => {
    const r = seoSchema.safeParse({ ...base, robots: '' })
    expect(r.success).toBe(true)
    expect(r.data?.robots).toBeNull()
  })

  it('accetta robots noindex,nofollow', () => {
    const r = seoSchema.safeParse({ ...base, robots: 'noindex,nofollow' })
    expect(r.success).toBe(true)
    expect(r.data?.robots).toBe('noindex,nofollow')
  })

  it('rifiuta robots con valore non previsto', () => {
    const r = seoSchema.safeParse({ ...base, robots: 'noindex' })
    expect(r.success).toBe(false)
  })

  it('jsonLdEnabled default è false', () => {
    const r = seoSchema.safeParse(base)
    expect(r.data?.jsonLdEnabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 2 — Validazione schema Robots/Humans
// ---------------------------------------------------------------------------
describe('Schema robots.txt / humans.txt', () => {
  it('accetta contenuto valido per entrambi i campi', () => {
    const r = robotsSchema.safeParse({ robots_txt: 'User-agent: *\nDisallow:', humans_txt: '# Team' })
    expect(r.success).toBe(true)
  })

  it('accetta stringhe vuote', () => {
    expect(robotsSchema.safeParse({ robots_txt: '', humans_txt: '' }).success).toBe(true)
  })

  it('rifiuta robots_txt > 10000 caratteri', () => {
    const r = robotsSchema.safeParse({ robots_txt: 'x'.repeat(10001), humans_txt: '' })
    expect(r.success).toBe(false)
  })

  it('rifiuta humans_txt > 10000 caratteri', () => {
    const r = robotsSchema.safeParse({ robots_txt: '', humans_txt: 'x'.repeat(10001) })
    expect(r.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 3 — upsertSeoPageAction()
// ---------------------------------------------------------------------------
describe('upsertSeoPageAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockRevalidatePath.mockReturnValue(undefined)
  })

  it('ritorna error se pathname mancante', async () => {
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('label', 'Label')
    const result = await upsertSeoPageAction(undefined, fd)
    expect(result.error).toBeDefined()
  })

  it('ritorna error se pathname non inizia con /', async () => {
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', 'pagina-senza-slash')
    fd.append('label', 'Label')
    const result = await upsertSeoPageAction(undefined, fd)
    expect(result.error).toContain('/')
  })

  it('ritorna error se label mancante', async () => {
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', '/pagina')
    const result = await upsertSeoPageAction(undefined, fd)
    expect(result.error).toBeDefined()
  })

  it('chiama upsertSeoPage se pathname non è cambiato', async () => {
    mockUpsertSeoPage.mockResolvedValue(undefined)
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', '/pagina')
    fd.append('label', 'Pagina')
    const result = await upsertSeoPageAction(undefined, fd)
    expect(result.success).toBe(true)
    expect(mockUpsertSeoPage).toHaveBeenCalledOnce()
    expect(mockRenameSeoPage).not.toHaveBeenCalled()
  })

  it('chiama renameSeoPage se pathname è cambiato', async () => {
    mockRenameSeoPage.mockResolvedValue(undefined)
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', '/nuovo-path')
    fd.append('originalPathname', '/vecchio-path')
    fd.append('label', 'Pagina')
    const result = await upsertSeoPageAction(undefined, fd)
    expect(result.success).toBe(true)
    expect(mockRenameSeoPage).toHaveBeenCalledWith('/vecchio-path', expect.objectContaining({
      pathname: '/nuovo-path',
    }))
    expect(mockUpsertSeoPage).not.toHaveBeenCalled()
  })

  it('normalizza ogImage vuota a null nel payload', async () => {
    mockUpsertSeoPage.mockResolvedValue(undefined)
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', '/pagina')
    fd.append('label', 'Pagina')
    fd.append('ogImage', '')
    await upsertSeoPageAction(undefined, fd)
    const call = mockUpsertSeoPage.mock.calls[0][0]
    expect(call.ogImage).toBeNull()
  })

  it('normalizza jsonLdType non valido a null', async () => {
    mockUpsertSeoPage.mockResolvedValue(undefined)
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', '/pagina')
    fd.append('label', 'Pagina')
    fd.append('jsonLdType', 'TipoNonValido')
    await upsertSeoPageAction(undefined, fd)
    const call = mockUpsertSeoPage.mock.calls[0][0]
    expect(call.jsonLdType).toBeNull()
  })

  it('accetta jsonLdType valido (es. Article)', async () => {
    mockUpsertSeoPage.mockResolvedValue(undefined)
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', '/pagina')
    fd.append('label', 'Pagina')
    fd.append('jsonLdType', 'Article')
    fd.append('jsonLdEnabled', 'true')
    await upsertSeoPageAction(undefined, fd)
    const call = mockUpsertSeoPage.mock.calls[0][0]
    expect(call.jsonLdType).toBe('Article')
    expect(call.jsonLdEnabled).toBe(true)
  })

  it('ritorna error se upsertSeoPage lancia eccezione', async () => {
    mockUpsertSeoPage.mockRejectedValue(new Error('DB error'))
    const { upsertSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const fd = new FormData()
    fd.append('pathname', '/pagina')
    fd.append('label', 'Pagina')
    const result = await upsertSeoPageAction(undefined, fd)
    expect(result.error).toBe('Errore nel salvataggio. Riprova.')
  })
})

// ---------------------------------------------------------------------------
// SECTION 4 — deleteSeoPageAction()
// ---------------------------------------------------------------------------
describe('deleteSeoPageAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockRevalidatePath.mockReturnValue(undefined)
  })

  it('ritorna error se pathname è stringa vuota', async () => {
    const { deleteSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const result = await deleteSeoPageAction('')
    expect(result.error).toBe('Pathname mancante')
  })

  it('elimina pagina SEO e ritorna success', async () => {
    mockDeleteSeoPage.mockResolvedValue(undefined)
    const { deleteSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const result = await deleteSeoPageAction('/pagina-da-eliminare')
    expect(result.success).toBe(true)
    expect(mockDeleteSeoPage).toHaveBeenCalledWith('/pagina-da-eliminare')
  })

  it('revalida /admin/seo e il pathname eliminato', async () => {
    mockDeleteSeoPage.mockResolvedValue(undefined)
    const { deleteSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    await deleteSeoPageAction('/mia-pagina')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/seo')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/mia-pagina')
  })

  it('ritorna error se deleteSeoPage lancia eccezione', async () => {
    mockDeleteSeoPage.mockRejectedValue(new Error('DB error'))
    const { deleteSeoPageAction } = await import('@/app/(admin)/admin/seo/actions')
    const result = await deleteSeoPageAction('/pagina')
    expect(result.error).toBe("Errore nell'eliminazione. Riprova.")
  })
})

// ---------------------------------------------------------------------------
// SECTION 5 — saveRobotsAction()
// ---------------------------------------------------------------------------
describe('saveRobotsAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockUpdateAppSetting.mockResolvedValue(undefined)
    mockRevalidatePath.mockReturnValue(undefined)
  })

  it('salva robots_txt e humans_txt e ritorna success', async () => {
    const { saveRobotsAction } = await import('@/app/(admin)/admin/seo/robots/actions')
    const fd = new FormData()
    fd.append('robots_txt', 'User-agent: *\nDisallow: /admin')
    fd.append('humans_txt', '# Team Librolo')
    const result = await saveRobotsAction({}, fd)
    expect('success' in result && result.success).toBe('File salvati con successo')
    expect(mockUpdateAppSetting).toHaveBeenCalledTimes(2)
  })

  it('passa null se robots_txt è stringa vuota', async () => {
    const { saveRobotsAction } = await import('@/app/(admin)/admin/seo/robots/actions')
    const fd = new FormData()
    fd.append('robots_txt', '')
    fd.append('humans_txt', '')
    await saveRobotsAction({}, fd)
    expect(mockUpdateAppSetting).toHaveBeenCalledWith('robots_txt', null)
    expect(mockUpdateAppSetting).toHaveBeenCalledWith('humans_txt', null)
  })

  it('revalida /robots.txt, /humans.txt e /admin/seo/robots', async () => {
    const { saveRobotsAction } = await import('@/app/(admin)/admin/seo/robots/actions')
    const fd = new FormData()
    fd.append('robots_txt', 'x')
    fd.append('humans_txt', 'y')
    await saveRobotsAction({}, fd)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/robots.txt')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/humans.txt')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/seo/robots')
  })

  it('ritorna { timestamp, error } se robots_txt supera 10000 caratteri', async () => {
    const { saveRobotsAction } = await import('@/app/(admin)/admin/seo/robots/actions')
    const fd = new FormData()
    fd.append('robots_txt', 'x'.repeat(10001))
    fd.append('humans_txt', '')
    const result = await saveRobotsAction({}, fd)
    expect('error' in result).toBe(true)
  })

  it('ritorna { timestamp, error } se updateAppSetting lancia eccezione', async () => {
    mockUpdateAppSetting.mockRejectedValue(new Error('DB error'))
    const { saveRobotsAction } = await import('@/app/(admin)/admin/seo/robots/actions')
    const fd = new FormData()
    fd.append('robots_txt', 'x')
    fd.append('humans_txt', 'y')
    const result = await saveRobotsAction({}, fd)
    expect('error' in result && result.error).toBe('Errore nel salvataggio. Riprova.')
  })

  it('il risultato contiene sempre timestamp', async () => {
    const { saveRobotsAction } = await import('@/app/(admin)/admin/seo/robots/actions')
    const fd = new FormData()
    fd.append('robots_txt', '')
    fd.append('humans_txt', '')
    const result = await saveRobotsAction({}, fd)
    expect('timestamp' in result).toBe(true)
  })
})
