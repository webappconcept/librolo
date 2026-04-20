// app/(admin)/admin/settings/tabs/redis-tab.tsx
'use client'

import { useActionState, useEffect, useRef } from 'react'
import { saveRedisSettings } from '../actions'
import type { ActionState } from '../actions'
import type { AppSettings } from '@/lib/db/settings-queries'
import { Database, Eye, EyeOff, Save, Wifi } from 'lucide-react'
import { useState } from 'react'

export function RedisTab({ settings }: { settings: AppSettings }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveRedisSettings,
    {},
  )
  const [showToken, setShowToken] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if ('success' in state) {
      // feedback visivo già gestito dal banner
    }
  }, [state])

  // Maschera il token per la visualizzazione: mostra solo i primi 8 caratteri
  const tokenMasked = settings.upstash_redis_rest_token
    ? settings.upstash_redis_rest_token.slice(0, 8) + '••••••••••••••••'
    : ''

  return (
    <div className="space-y-6">

      {/* Header sezione */}
      <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'color-mix(in oklch, var(--admin-accent) 12%, transparent)' }}
        >
          <Database size={18} style={{ color: 'var(--admin-accent)' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Redis · Upstash
          </h2>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Credenziali per il Bloom Filter live (email, username, domini).
          </p>
        </div>
      </div>

      {/* Feedback banner */}
      {'success' in state && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: 'color-mix(in oklch, var(--admin-success, #437a22) 10%, transparent)',
            border: '1px solid color-mix(in oklch, var(--admin-success, #437a22) 30%, transparent)',
            color: 'var(--admin-success, #437a22)',
          }}
        >
          {state.success}
        </div>
      )}
      {'error' in state && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: 'color-mix(in oklch, var(--admin-error, #a12c7b) 10%, transparent)',
            border: '1px solid color-mix(in oklch, var(--admin-error, #a12c7b) 30%, transparent)',
            color: 'var(--admin-error, #a12c7b)',
          }}
        >
          {state.error}
        </div>
      )}

      {/* Form */}
      <form ref={formRef} action={formAction} className="space-y-5">

        {/* REST URL */}
        <div className="space-y-1.5">
          <label
            htmlFor="upstash_redis_rest_url"
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            REST URL
          </label>
          <input
            id="upstash_redis_rest_url"
            name="upstash_redis_rest_url"
            type="url"
            defaultValue={settings.upstash_redis_rest_url ?? ''}
            placeholder="https://your-db.upstash.io"
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
            style={{
              background: 'var(--admin-input-bg)',
              border: '1px solid var(--admin-card-border)',
              color: 'var(--admin-text)',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--admin-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--admin-card-border)')}
          />
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Trovalo in Upstash Console → Database → REST API → Endpoint
          </p>
        </div>

        {/* REST Token */}
        <div className="space-y-1.5">
          <label
            htmlFor="upstash_redis_rest_token"
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--admin-text-muted)' }}>
            REST Token
          </label>
          <div className="relative">
            <input
              id="upstash_redis_rest_token"
              name="upstash_redis_rest_token"
              type={showToken ? 'text' : 'password'}
              defaultValue={settings.upstash_redis_rest_token ?? ''}
              placeholder={tokenMasked || 'AX••••••••••••••••'}
              className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm font-mono"
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-card-border)',
                color: 'var(--admin-text)',
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--admin-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--admin-card-border)')}
            />
            <button
              type="button"
              aria-label={showToken ? 'Nascondi token' : 'Mostra token'}
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Trovalo in Upstash Console → Database → REST API → Read/Write Token
          </p>
        </div>

        {/* Info box */}
        <div
          className="flex gap-3 px-4 py-3 rounded-lg text-xs"
          style={{
            background: 'color-mix(in oklch, var(--admin-accent) 6%, var(--admin-card-bg))',
            border: '1px solid color-mix(in oklch, var(--admin-accent) 20%, transparent)',
          }}
        >
          <Wifi size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--admin-accent)' }} />
          <p style={{ color: 'var(--admin-text-muted)' }}>
            Queste credenziali vengono usate dal <strong style={{ color: 'var(--admin-text)' }}>Bloom Filter</strong> per
            controllare email, username e domini direttamente su Upstash Redis —
            senza roundtrip al database.
            I valori sono salvati in <code className="px-1 rounded" style={{ background: 'var(--admin-card-border)' }}>app_settings</code> e
            letti solo server-side.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity"
            style={{
              background: 'var(--admin-accent)',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            <Save size={15} />
            {isPending ? 'Salvataggio…' : 'Salva credenziali'}
          </button>
        </div>

      </form>
    </div>
  )
}
