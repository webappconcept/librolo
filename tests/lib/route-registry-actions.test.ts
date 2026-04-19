// tests/lib/route-registry-actions.test.ts
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Test della logica delle Server Actions del pannello Route Registry.
// Le actions reali chiamano il DB (Supabase) e requireAdmin() che richiede
// contesto server — qui testiamo la validazione Zod in isolamento,
// replicando lo stesso schema usato in actions.ts.
// ---------------------------------------------------------------------------

import { z } from 'zod'

const schema = z.object({
  id: z.string().uuid().optional(),
  pathname: z
    .string()
    .min(1, 'Il pathname è obbligatorio')
    .regex(/^\//, { message: 'Il pathname deve iniziare con /' }),
  label: z
    .string()
    .min(1, "L'etichetta è obbligatoria")
    .max(150, 'Max 150 caratteri'),
  visibility: z.enum(['public', 'private', 'admin', 'auth-only'], {
    errorMap: () => ({ message: 'Visibilità non valida' }),
  }),
  inNav:     z.string().optional(),
  inFooter:  z.string().optional(),
  inSitemap: z.string().optional(),
  isActive:  z.string().optional(),
})

describe('upsertRouteAction — validazione schema', () => {
  it('accetta una route valida completa', () => {
    const res = schema.safeParse({
      pathname:   '/dashboard',
      label:      'Dashboard',
      visibility: 'private',
      inNav:      'true',
      inFooter:   'false',
      inSitemap:  'true',
      isActive:   'true',
    })
    expect(res.success).toBe(true)
  })

  it('accetta una route senza id (create)', () => {
    const res = schema.safeParse({
      pathname:   '/sign-in',
      label:      'Sign In',
      visibility: 'auth-only',
    })
    expect(res.success).toBe(true)
  })

  it('accetta una route con id uuid (update)', () => {
    const res = schema.safeParse({
      id:         '550e8400-e29b-41d4-a716-446655440000',
      pathname:   '/profilo',
      label:      'Profilo',
      visibility: 'private',
    })
    expect(res.success).toBe(true)
  })

  it('rifiuta pathname senza slash iniziale', () => {
    const res = schema.safeParse({
      pathname:   'dashboard',
      label:      'Dashboard',
      visibility: 'private',
    })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0]?.message).toContain('/')
  })

  it('rifiuta pathname vuoto', () => {
    const res = schema.safeParse({
      pathname:   '',
      label:      'Dashboard',
      visibility: 'private',
    })
    expect(res.success).toBe(false)
  })

  it('rifiuta label vuota', () => {
    const res = schema.safeParse({
      pathname:   '/test',
      label:      '',
      visibility: 'public',
    })
    expect(res.success).toBe(false)
  })

  it('rifiuta visibility non valida', () => {
    const res = schema.safeParse({
      pathname:   '/test',
      label:      'Test',
      visibility: 'unknown',
    })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0]?.message).toBe('Visibilità non valida')
  })

  it('rifiuta id non-uuid', () => {
    const res = schema.safeParse({
      id:         'not-a-uuid',
      pathname:   '/test',
      label:      'Test',
      visibility: 'public',
    })
    expect(res.success).toBe(false)
  })

  it('label oltre 150 caratteri viene rifiutata', () => {
    const res = schema.safeParse({
      pathname:   '/test',
      label:      'a'.repeat(151),
      visibility: 'public',
    })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0]?.message).toContain('150')
  })
})

describe('flag booleani — coercion da FormData string', () => {
  function coerce(raw: Record<string, string | undefined>) {
    return {
      inNav:     raw.inNav      === 'true',
      inFooter:  raw.inFooter   === 'true',
      inSitemap: raw.inSitemap  !== 'false',
      isActive:  raw.isActive   !== 'false',
    }
  }

  it('converte correttamente i flag quando tutti true', () => {
    const f = coerce({ inNav: 'true', inFooter: 'true', inSitemap: 'true', isActive: 'true' })
    expect(f).toEqual({ inNav: true, inFooter: true, inSitemap: true, isActive: true })
  })

  it('converte correttamente i flag quando tutti false', () => {
    const f = coerce({ inNav: undefined, inFooter: undefined, inSitemap: 'false', isActive: 'false' })
    expect(f).toEqual({ inNav: false, inFooter: false, inSitemap: false, isActive: false })
  })

  it('inSitemap e isActive sono true se assenti (default checkbox HTML)', () => {
    // Un checkbox HTML non spedisce nulla se non è checked — la coercion
    // deve interpretare undefined come true per inSitemap e isActive
    const f = coerce({})
    expect(f.inSitemap).toBe(true)
    expect(f.isActive).toBe(true)
  })

  it('inNav e inFooter sono false se assenti (default false)', () => {
    const f = coerce({})
    expect(f.inNav).toBe(false)
    expect(f.inFooter).toBe(false)
  })
})
