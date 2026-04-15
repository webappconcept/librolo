import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock DB
// IMPORTANTE: la chain drizzle in can.ts usa pattern diversi per query:
//   - can():  .orderBy().limit()  oppure  .limit()
//   - getUserPermissions(): query SENZA .limit() finale -- .where() e' terminale
//             (drizzle restituisce una Promise direttamente dalla chain)
//
// La chain mock deve quindi:
//   1. Avere .where() che restituisce un oggetto awaitable (thenable)
//   2. Avere .limit() come metodo su quello stesso oggetto
//   3. Avere .orderBy() che restituisce un oggetto con .limit()
// ---------------------------------------------------------------------------
const mockSelect = vi.fn()

vi.mock('@/lib/db/drizzle', () => ({
  db: { select: mockSelect },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

vi.mock('server-only', () => ({}))

const mockGetUser = vi.fn()
vi.mock('@/lib/db/queries', () => ({ getUser: mockGetUser }))

// ---------------------------------------------------------------------------
// makeChain: costruisce una chain drizzle-compatibile dove .where() e'
// ANCHE una Promise (per query senza .limit() finale come in getUserPermissions)
// ---------------------------------------------------------------------------
function makeChain(rows: unknown[]) {
  const resolvedPromise = Promise.resolve(rows)
  const terminal = vi.fn().mockResolvedValue(rows)

  // .where() deve essere sia una funzione che una Promise (thenable)
  const where = Object.assign(
    vi.fn(() => where),  // ritorna se stessa per concatenazione
    {
      then:      resolvedPromise.then.bind(resolvedPromise),
      catch:     resolvedPromise.catch.bind(resolvedPromise),
      finally:   resolvedPromise.finally.bind(resolvedPromise),
      limit:     terminal,
      orderBy:   vi.fn(() => ({ limit: terminal })),
      innerJoin: vi.fn(() => where),
    },
  )

  const chain: Record<string, unknown> = {
    from:      vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where,
    limit:     terminal,
    orderBy:   vi.fn(() => ({ limit: terminal })),
  }

  // anche la chain root e' awaitable (fallback)
  const chainPromise = Promise.resolve(rows)
  Object.assign(chain, {
    then:    chainPromise.then.bind(chainPromise),
    catch:   chainPromise.catch.bind(chainPromise),
    finally: chainPromise.finally.bind(chainPromise),
  })

  mockSelect.mockReturnValue(chain)
  return chain
}

// Sequenza di chiamate: ogni elemento corrisponde a una chiamata db.select()
function makeSequence(sequences: unknown[][]) {
  let call = 0
  mockSelect.mockImplementation(() => {
    const rows = sequences[call] ?? []
    call++
    return makeChainRaw(rows)
  })
}

function makeChainRaw(rows: unknown[]) {
  const resolvedPromise = Promise.resolve(rows)
  const terminal = vi.fn().mockResolvedValue(rows)

  const where = Object.assign(
    vi.fn(() => where),
    {
      then:      resolvedPromise.then.bind(resolvedPromise),
      catch:     resolvedPromise.catch.bind(resolvedPromise),
      finally:   resolvedPromise.finally.bind(resolvedPromise),
      limit:     terminal,
      orderBy:   vi.fn(() => ({ limit: terminal })),
      innerJoin: vi.fn(() => where),
    },
  )

  const chain: Record<string, unknown> = {
    from:      vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where,
    limit:     terminal,
    orderBy:   vi.fn(() => ({ limit: terminal })),
  }

  const chainPromise = Promise.resolve(rows)
  Object.assign(chain, {
    then:    chainPromise.then.bind(chainPromise),
    catch:   chainPromise.catch.bind(chainPromise),
    finally: chainPromise.finally.bind(chainPromise),
  })

  return chain
}

// ---------------------------------------------------------------------------
// SECTION 1 -- can()
// ---------------------------------------------------------------------------
describe('can()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('ritorna true se esiste un override individuale granted=true', async () => {
    makeSequence([[{ granted: true }], []])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 1, role: 'member' }, 'admin:access')
    expect(result).toBe(true)
  })

  it('ritorna false se esiste un override individuale granted=false', async () => {
    makeSequence([[{ granted: false }], []])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 1, role: 'admin' }, 'admin:users')
    expect(result).toBe(false)
  })

  it('ritorna true se nessun override ma il ruolo ha il permesso', async () => {
    makeSequence([[], [{ id: 5 }]])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 2, role: 'admin' }, 'admin:access')
    expect(result).toBe(true)
  })

  it('ritorna false se nessun override e il ruolo non ha il permesso', async () => {
    makeSequence([[], []])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 3, role: 'member' }, 'admin:access')
    expect(result).toBe(false)
  })

  it('override ha priorita sul ruolo anche se il ruolo avrebbe accesso', async () => {
    makeSequence([[{ granted: false }], [{ id: 5 }]])
    const { can } = await import('@/lib/rbac/can')
    const result = await can({ id: 4, role: 'admin' }, 'admin:access')
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 2 -- getUserPermissions()
// ---------------------------------------------------------------------------
describe('getUserPermissions()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce i permessi del ruolo come Set', async () => {
    makeSequence([
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
    makeSequence([
      [{ key: 'content:read' }],
      [{ key: 'admin:content', granted: true, createdAt: new Date() }],
    ])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 2, role: 'member' })
    expect(perms.has('content:read')).toBe(true)
    expect(perms.has('admin:content')).toBe(true)
  })

  it('applica override revoke: rimuove permesso presente nel ruolo', async () => {
    makeSequence([
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
    makeSequence([
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
    makeSequence([[], []])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 99, role: 'ghost' })
    expect(perms.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// SECTION 3 -- canAny() / canAll()
// ---------------------------------------------------------------------------
describe('canAny() / canAll()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('canAny: true se almeno uno dei permessi e presente', async () => {
    makeSequence([
      [{ key: 'admin:access' }],
      [],
    ])
    const { canAny } = await import('@/lib/rbac/can')
    const result = await canAny({ id: 1, role: 'admin' }, ['admin:access', 'admin:billing'])
    expect(result).toBe(true)
  })

  it('canAny: false se nessuno dei permessi e presente', async () => {
    makeSequence([[], []])
    const { canAny } = await import('@/lib/rbac/can')
    const result = await canAny({ id: 2, role: 'member' }, ['admin:access', 'admin:billing'])
    expect(result).toBe(false)
  })

  it('canAll: true se tutti i permessi sono presenti', async () => {
    makeSequence([
      [{ key: 'admin:access' }, { key: 'admin:users' }],
      [],
    ])
    const { canAll } = await import('@/lib/rbac/can')
    const result = await canAll({ id: 1, role: 'admin' }, ['admin:access', 'admin:users'])
    expect(result).toBe(true)
  })

  it('canAll: false se anche solo un permesso manca', async () => {
    makeSequence([
      [{ key: 'admin:access' }],
      [],
    ])
    const { canAll } = await import('@/lib/rbac/can')
    const result = await canAll({ id: 1, role: 'admin' }, ['admin:access', 'admin:billing'])
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 4 -- guards.ts: requireAdminPage / requireAdminSectionPage
// ---------------------------------------------------------------------------
describe('guards.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('requireAdminPage()', () => {
    it('redirige a /admin/sign-in se utente non autenticato', async () => {
      mockGetUser.mockResolvedValue(null)
      makeChain([])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('redirige a /admin/sign-in se autenticato ma senza admin:access', async () => {
      mockGetUser.mockResolvedValue({ id: 1, role: 'member', isAdmin: false })
      makeSequence([[], []])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('ritorna utente se ha admin:access via ruolo', async () => {
      const user = { id: 2, role: 'admin', isAdmin: false }
      mockGetUser.mockResolvedValue(user)
      makeSequence([[], [{ id: 1 }]])
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
      makeChain([])
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
      makeSequence([[], []])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('redirige a /admin se ha admin:access ma non il permesso della sezione', async () => {
      mockGetUser.mockResolvedValue({ id: 4, role: 'staff', isAdmin: false })
      makeSequence([[], [{ id: 1 }], [], []])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin')
    })

    it('ritorna utente se ha sia admin:access sia il permesso della sezione', async () => {
      const user = { id: 5, role: 'admin', isAdmin: false }
      mockGetUser.mockResolvedValue(user)
      makeSequence([[], [{ id: 1 }], [], [{ id: 2 }]])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      const result = await requireAdminSectionPage('admin:users')
      expect(result).toEqual(user)
    })
  })
})
