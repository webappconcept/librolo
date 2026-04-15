import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock DB — intercetta tutte le query drizzle senza toccare il DB reale
// ---------------------------------------------------------------------------
const mockSelect = vi.fn()

vi.mock('@/lib/db/drizzle', () => ({
  db: { select: mockSelect },
}))

// Mock next/navigation (redirect lancia, lo catturiamo)
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock getUser — controllato per-test
const mockGetUser = vi.fn()
vi.mock('@/lib/db/queries', () => ({ getUser: mockGetUser }))

// ---------------------------------------------------------------------------
// Helper: costruisce la catena fluente di drizzle
//   db.select().from().where().orderBy().limit()  → rows
//   db.select().from().where().limit()            → rows
//   db.select().from().where()                    → rows
// ---------------------------------------------------------------------------
function mockDbChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {}
  const terminal = vi.fn().mockResolvedValue(rows)
  chain.limit    = terminal
  chain.orderBy  = vi.fn(() => ({ limit: terminal }))
  chain.where    = vi.fn(() => chain)
  chain.innerJoin = vi.fn(() => chain)
  chain.from     = vi.fn(() => chain)
  mockSelect.mockReturnValue(chain)
  return chain
}

// Sequenza di chiamate DB: prima override check, poi role check (o viceversa)
function mockDbSequence(sequences: unknown[][]) {
  let call = 0
  mockSelect.mockImplementation(() => {
    const rows = sequences[call] ?? []
    call++
    const terminal = vi.fn().mockResolvedValue(rows)
    const chain: Record<string, unknown> = {}
    chain.limit     = terminal
    chain.orderBy   = vi.fn(() => ({ limit: terminal }))
    chain.where     = vi.fn(() => chain)
    chain.innerJoin = vi.fn(() => chain)
    chain.from      = vi.fn(() => chain)
    return chain
  })
}

// ---------------------------------------------------------------------------
// SECTION 1 — can()
// ---------------------------------------------------------------------------
describe('can()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('ritorna true se esiste un override individuale granted=true', async () => {
    mockDbSequence([[{ granted: true }], []])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 1, role: 'member' }, 'admin:access')
    expect(result).toBe(true)
  })

  it('ritorna false se esiste un override individuale granted=false', async () => {
    mockDbSequence([[{ granted: false }], []])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 1, role: 'admin' }, 'admin:users')
    expect(result).toBe(false)
  })

  it('ritorna true se nessun override ma il ruolo ha il permesso', async () => {
    mockDbSequence([[], [{ id: 5 }]])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 2, role: 'admin' }, 'admin:access')
    expect(result).toBe(true)
  })

  it('ritorna false se nessun override e il ruolo non ha il permesso', async () => {
    mockDbSequence([[], []])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 3, role: 'member' }, 'admin:access')
    expect(result).toBe(false)
  })

  it('override ha priorita sul ruolo anche se il ruolo avrebbe accesso', async () => {
    mockDbSequence([[{ granted: false }], [{ id: 5 }]])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 4, role: 'admin' }, 'admin:access')
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 2 — getUserPermissions()
// ---------------------------------------------------------------------------
describe('getUserPermissions()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce i permessi del ruolo come Set', async () => {
    mockDbSequence([
      [{ key: 'admin:access' }, { key: 'admin:users' }],
      [],
    ])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 1, role: 'admin' })
    expect(perms.has('admin:access')).toBe(true)
    expect(perms.has('admin:users')).toBe(true)
    expect(perms.has('admin:billing')).toBe(false)
  })

  it('applica override grant: aggiunge permesso non nel ruolo', async () => {
    mockDbSequence([
      [{ key: 'content:read' }],
      [{ key: 'admin:content', granted: true, createdAt: new Date() }],
    ])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 2, role: 'member' })
    expect(perms.has('content:read')).toBe(true)
    expect(perms.has('admin:content')).toBe(true)
  })

  it('applica override revoke: rimuove permesso presente nel ruolo', async () => {
    mockDbSequence([
      [{ key: 'admin:access' }, { key: 'admin:users' }],
      [{ key: 'admin:users', granted: false, createdAt: new Date() }],
    ])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 3, role: 'admin' })
    expect(perms.has('admin:access')).toBe(true)
    expect(perms.has('admin:users')).toBe(false)
  })

  it('deduplicazione: vince la riga piu recente in caso di duplicati', async () => {
    const now   = new Date()
    const older = new Date(now.getTime() - 5000)
    mockDbSequence([
      [{ key: 'admin:access' }],
      [
        { key: 'admin:access', granted: false, createdAt: now },
        { key: 'admin:access', granted: true,  createdAt: older },
      ],
    ])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 4, role: 'admin' })
    expect(perms.has('admin:access')).toBe(false)
  })

  it('utente senza ruolo riconosciuto ha Set vuoto (no override)', async () => {
    mockDbSequence([[], []])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 99, role: 'ghost' })
    expect(perms.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// SECTION 3 — canAny() / canAll()
// ---------------------------------------------------------------------------
describe('canAny() / canAll()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('canAny: true se almeno uno dei permessi e presente', async () => {
    mockDbSequence([
      [{ key: 'admin:access' }],
      [],
    ])
    const { canAny } = await import('@/lib/rbac/can')
    const result = await canAny({ id: 1, role: 'admin' }, ['admin:access', 'admin:billing'])
    expect(result).toBe(true)
  })

  it('canAny: false se nessuno dei permessi e presente', async () => {
    mockDbSequence([[], []])
    const { canAny } = await import('@/lib/rbac/can')
    const result = await canAny({ id: 2, role: 'member' }, ['admin:access', 'admin:billing'])
    expect(result).toBe(false)
  })

  it('canAll: true se tutti i permessi sono presenti', async () => {
    mockDbSequence([
      [{ key: 'admin:access' }, { key: 'admin:users' }],
      [],
    ])
    const { canAll } = await import('@/lib/rbac/can')
    const result = await canAll({ id: 1, role: 'admin' }, ['admin:access', 'admin:users'])
    expect(result).toBe(true)
  })

  it('canAll: false se anche solo un permesso manca', async () => {
    mockDbSequence([
      [{ key: 'admin:access' }],
      [],
    ])
    const { canAll } = await import('@/lib/rbac/can')
    const result = await canAll({ id: 1, role: 'admin' }, ['admin:access', 'admin:billing'])
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 4 — guards.ts: requireAdminPage / requireAdminSectionPage
// ---------------------------------------------------------------------------
describe('guards.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('requireAdminPage()', () => {
    it('redirige a /admin/sign-in se utente non autenticato', async () => {
      mockGetUser.mockResolvedValue(null)
      mockDbChain([])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('redirige a /admin/sign-in se autenticato ma senza admin:access', async () => {
      mockGetUser.mockResolvedValue({ id: 1, role: 'member', isAdmin: false })
      mockDbSequence([[], []])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('ritorna utente se ha admin:access via ruolo', async () => {
      const user = { id: 2, role: 'admin', isAdmin: false }
      mockGetUser.mockResolvedValue(user)
      mockDbSequence([[], [{ id: 1 }]])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      const result = await requireAdminPage()
      expect(result).toEqual(user)
    })

    it('ritorna utente se isAdmin=true (bypassa RBAC)', async () => {
      const user = { id: 10, role: 'member', isAdmin: true }
      mockGetUser.mockResolvedValue(user)
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      const result = await requireAdminPage()
      expect(result).toEqual(user)
    })
  })

  describe('requireAdminSectionPage()', () => {
    it('redirige a /admin/sign-in se non autenticato', async () => {
      mockGetUser.mockResolvedValue(null)
      mockDbChain([])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('bypassa tutto se isAdmin=true', async () => {
      const user = { id: 10, role: 'member', isAdmin: true }
      mockGetUser.mockResolvedValue(user)
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      const result = await requireAdminSectionPage('admin:users')
      expect(result).toEqual(user)
    })

    it('redirige a /admin/sign-in se non ha admin:access', async () => {
      mockGetUser.mockResolvedValue({ id: 3, role: 'member', isAdmin: false })
      mockDbSequence([[], []])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('redirige a /admin se ha admin:access ma non il permesso della sezione', async () => {
      mockGetUser.mockResolvedValue({ id: 4, role: 'staff', isAdmin: false })
      mockDbSequence([
        [], [{ id: 1 }],
        [], [],
      ])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin')
    })

    it('ritorna utente se ha sia admin:access sia il permesso della sezione', async () => {
      const user = { id: 5, role: 'admin', isAdmin: false }
      mockGetUser.mockResolvedValue(user)
      mockDbSequence([
        [], [{ id: 1 }],
        [], [{ id: 2 }],
      ])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      const result = await requireAdminSectionPage('admin:users')
      expect(result).toEqual(user)
    })
  })
})
