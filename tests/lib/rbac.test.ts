import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock DB
//
// getUserPermissions() esegue 2 query con strutture diverse:
//
//   Query 1 (rolePerms):  db.select().from().innerJoin().innerJoin().where()
//                         → terminale SENZA .limit(), drizzle ritorna Promise
//
//   Query 2 (overrides):  db.select().from().innerJoin().where().orderBy(desc(...))
//                         → terminale su .orderBy(), senza .limit()
//
// can() usa invece .orderBy().limit(1) e .limit(1) come terminale.
//
// La chain deve essere un oggetto thenable a ogni livello: .where(), .orderBy()
// devono entrambi essere sia funzioni sia Promise.
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

// Costruisce una chain drizzle-compatibile dove where() e orderBy() sono
// entrambi thenable (Promise) e supportano anche .limit() e .innerJoin()
function buildChain(rows: unknown[]) {
  const p = () => Promise.resolve(rows)
  const terminal = vi.fn().mockResolvedValue(rows)

  function makeThenableFunc(fn: (...args: unknown[]) => unknown) {
    const pr = p()
    return Object.assign(fn, {
      then:    pr.then.bind(pr),
      catch:   pr.catch.bind(pr),
      finally: pr.finally.bind(pr),
    })
  }

  // orderBy e' thenable e ha .limit()
  const orderBy: Record<string, unknown> = makeThenableFunc(vi.fn(() => orderBy))
  orderBy.limit = terminal

  // where e' thenable e ha .limit() e .orderBy()
  const where: Record<string, unknown> = makeThenableFunc(vi.fn(() => where))
  where.limit   = terminal
  where.orderBy = orderBy
  where.innerJoin = vi.fn(() => where)

  const chain: Record<string, unknown> = {
    from:      vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where,
    orderBy,
    limit:     terminal,
  }
  // anche chain root e' thenable (fallback)
  const pr = p()
  Object.assign(chain, {
    then:    pr.then.bind(pr),
    catch:   pr.catch.bind(pr),
    finally: pr.finally.bind(pr),
  })

  mockSelect.mockReturnValue(chain)
  return chain
}

// Sequenza: ogni chiamata a db.select() usa la slice successiva di `sequences`
function buildSequence(sequences: unknown[][]) {
  let call = 0
  mockSelect.mockImplementation(() => {
    const rows = sequences[call] ?? []
    call++
    return buildChain(rows)
  })
}

// ---------------------------------------------------------------------------
// SECTION 1 -- can()
// ---------------------------------------------------------------------------
describe('can()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('ritorna true se esiste un override individuale granted=true', async () => {
    buildSequence([[{ granted: true }], []])
    const { can } = await import('@/lib/rbac/can')
    expect(await can({ id: 1, role: 'member' }, 'admin:access')).toBe(true)
  })

  it('ritorna false se esiste un override individuale granted=false', async () => {
    buildSequence([[{ granted: false }], []])
    const { can } = await import('@/lib/rbac/can')
    expect(await can({ id: 1, role: 'admin' }, 'admin:users')).toBe(false)
  })

  it('ritorna true se nessun override ma il ruolo ha il permesso', async () => {
    buildSequence([[], [{ id: 5 }]])
    const { can } = await import('@/lib/rbac/can')
    expect(await can({ id: 2, role: 'admin' }, 'admin:access')).toBe(true)
  })

  it('ritorna false se nessun override e il ruolo non ha il permesso', async () => {
    buildSequence([[], []])
    const { can } = await import('@/lib/rbac/can')
    expect(await can({ id: 3, role: 'member' }, 'admin:access')).toBe(false)
  })

  it('override ha priorita sul ruolo anche se il ruolo avrebbe accesso', async () => {
    buildSequence([[{ granted: false }], [{ id: 5 }]])
    const { can } = await import('@/lib/rbac/can')
    expect(await can({ id: 4, role: 'admin' }, 'admin:access')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 2 -- getUserPermissions()
// ---------------------------------------------------------------------------
describe('getUserPermissions()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce i permessi del ruolo come Set', async () => {
    buildSequence([
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
    buildSequence([
      [{ key: 'content:read' }],
      [{ key: 'admin:content', granted: true, createdAt: new Date() }],
    ])
    const { getUserPermissions } = await import('@/lib/rbac/can')
    const perms = await getUserPermissions({ id: 2, role: 'member' })
    expect(perms.has('content:read')).toBe(true)
    expect(perms.has('admin:content')).toBe(true)
  })

  it('applica override revoke: rimuove permesso presente nel ruolo', async () => {
    buildSequence([
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
    buildSequence([
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
    buildSequence([[], []])
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
    buildSequence([[{ key: 'admin:access' }], []])
    const { canAny } = await import('@/lib/rbac/can')
    expect(await canAny({ id: 1, role: 'admin' }, ['admin:access', 'admin:billing'])).toBe(true)
  })

  it('canAny: false se nessuno dei permessi e presente', async () => {
    buildSequence([[], []])
    const { canAny } = await import('@/lib/rbac/can')
    expect(await canAny({ id: 2, role: 'member' }, ['admin:access', 'admin:billing'])).toBe(false)
  })

  it('canAll: true se tutti i permessi sono presenti', async () => {
    buildSequence([[{ key: 'admin:access' }, { key: 'admin:users' }], []])
    const { canAll } = await import('@/lib/rbac/can')
    expect(await canAll({ id: 1, role: 'admin' }, ['admin:access', 'admin:users'])).toBe(true)
  })

  it('canAll: false se anche solo un permesso manca', async () => {
    buildSequence([[{ key: 'admin:access' }], []])
    const { canAll } = await import('@/lib/rbac/can')
    expect(await canAll({ id: 1, role: 'admin' }, ['admin:access', 'admin:billing'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SECTION 4 -- guards.ts
// ---------------------------------------------------------------------------
describe('guards.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('requireAdminPage()', () => {
    it('redirige a /admin/sign-in se utente non autenticato', async () => {
      mockGetUser.mockResolvedValue(null)
      buildChain([])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('redirige a /admin/sign-in se autenticato ma senza admin:access', async () => {
      mockGetUser.mockResolvedValue({ id: 1, role: 'member', isAdmin: false })
      buildSequence([[], []])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('ritorna utente se ha admin:access via ruolo', async () => {
      const user = { id: 2, role: 'admin', isAdmin: false }
      mockGetUser.mockResolvedValue(user)
      buildSequence([[], [{ id: 1 }]])
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      expect(await requireAdminPage()).toEqual(user)
    })

    it('ritorna utente se isAdmin=true (bypassa RBAC)', async () => {
      const user = { id: 10, role: 'member', isAdmin: true }
      mockGetUser.mockResolvedValue(user)
      const { requireAdminPage } = await import('@/lib/rbac/guards')
      expect(await requireAdminPage()).toEqual(user)
    })
  })

  describe('requireAdminSectionPage()', () => {
    it('redirige a /admin/sign-in se non autenticato', async () => {
      mockGetUser.mockResolvedValue(null)
      buildChain([])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('bypassa tutto se isAdmin=true', async () => {
      const user = { id: 10, role: 'member', isAdmin: true }
      mockGetUser.mockResolvedValue(user)
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      expect(await requireAdminSectionPage('admin:users')).toEqual(user)
    })

    it('redirige a /admin/sign-in se non ha admin:access', async () => {
      mockGetUser.mockResolvedValue({ id: 3, role: 'member', isAdmin: false })
      buildSequence([[], []])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin/sign-in')
    })

    it('redirige a /admin se ha admin:access ma non il permesso della sezione', async () => {
      mockGetUser.mockResolvedValue({ id: 4, role: 'staff', isAdmin: false })
      buildSequence([[], [{ id: 1 }], [], []])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      await expect(requireAdminSectionPage('admin:users')).rejects.toThrow('REDIRECT:/admin')
    })

    it('ritorna utente se ha sia admin:access sia il permesso della sezione', async () => {
      const user = { id: 5, role: 'admin', isAdmin: false }
      mockGetUser.mockResolvedValue(user)
      buildSequence([[], [{ id: 1 }], [], [{ id: 2 }]])
      const { requireAdminSectionPage } = await import('@/lib/rbac/guards')
      expect(await requireAdminSectionPage('admin:users')).toEqual(user)
    })
  })
})
