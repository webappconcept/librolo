"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import {
  Database,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Wifi,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  saveRedisSettings,
  testRedisConnection,
  type ActionState,
} from "../actions";

export function RedisTab({ settings }: { settings: AppSettings }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveRedisSettings,
    {},
  );
  const [testState, testAction, isTesting] = useActionState<ActionState, FormData>(
    testRedisConnection,
    {},
  );
  const [showToken, setShowToken] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const lastTs = useRef<number>(0);
  const lastTestTs = useRef<number>(0);

  useEffect(() => {
    if (!("timestamp" in state)) return;
    if (state.timestamp === lastTs.current) return;
    lastTs.current = state.timestamp;
    if ("success" in state && state.success)
      setToast({ message: state.success, type: "success" });
    if ("error" in state && state.error)
      setToast({ message: state.error, type: "error" });
  }, [state]);

  useEffect(() => {
    if (!("timestamp" in testState)) return;
    if (testState.timestamp === lastTestTs.current) return;
    lastTestTs.current = testState.timestamp;
    if ("success" in testState && testState.success)
      setToast({ message: testState.success, type: "success" });
    if ("error" in testState && testState.error)
      setToast({ message: testState.error, type: "error" });
  }, [testState]);

  const tokenMasked = settings.upstash_redis_rest_token
    ? settings.upstash_redis_rest_token.slice(0, 8) + "••••••••••••••••"
    : "";

  return (
    <>
      <div className="space-y-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="upstash_redis_rest_url"
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--admin-text-muted)" }}>
              REST URL
            </label>
            <input
              id="upstash_redis_rest_url"
              name="upstash_redis_rest_url"
              type="url"
              defaultValue={settings.upstash_redis_rest_url ?? ""}
              placeholder="https://your-db.upstash.io"
              className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
              style={{
                background: "var(--admin-input-bg)",
                border: "1px solid var(--admin-card-border)",
                color: "var(--admin-text)",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--admin-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--admin-card-border)")}
            />
            <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              Trovalo in Upstash Console → Database → REST API → Endpoint
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="upstash_redis_rest_token"
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--admin-text-muted)" }}>
              REST Token
            </label>
            <div className="relative">
              <input
                id="upstash_redis_rest_token"
                name="upstash_redis_rest_token"
                type={showToken ? "text" : "password"}
                defaultValue={settings.upstash_redis_rest_token ?? ""}
                placeholder={tokenMasked || "AX••••••••••••••••"}
                className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm font-mono"
                style={{
                  background: "var(--admin-input-bg)",
                  border: "1px solid var(--admin-card-border)",
                  color: "var(--admin-text)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--admin-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--admin-card-border)")}
              />
              <button
                type="button"
                aria-label={showToken ? "Nascondi token" : "Mostra token"}
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                style={{ color: "var(--admin-text-muted)" }}>
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              Trovalo in Upstash Console → Database → REST API → Read/Write Token
            </p>
          </div>

          <div
            className="flex gap-3 px-4 py-3 rounded-lg text-xs"
            style={{
              background: "color-mix(in oklch, var(--admin-accent) 6%, var(--admin-card-bg))",
              border: "1px solid color-mix(in oklch, var(--admin-accent) 20%, transparent)",
            }}>
            <Wifi size={14} className="shrink-0 mt-0.5" style={{ color: "var(--admin-accent)" }} />
            <p style={{ color: "var(--admin-text-muted)" }}>
              Queste credenziali vengono usate dal <strong style={{ color: "var(--admin-text)" }}>Bloom Filter</strong> per
              controllare email, username e domini direttamente su Upstash Redis —
              senza roundtrip al database.
              I valori sono salvati in <code className="px-1 rounded" style={{ background: "var(--admin-card-border)" }}>app_settings</code> e
              letti solo server-side.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity"
              style={{
                background: "var(--admin-accent)",
                opacity: isPending ? 0.6 : 1,
              }}>
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {isPending ? "Salvataggio…" : "Salva credenziali"}
            </button>
          </div>
        </form>

        <form action={testAction}>
          <input type="hidden" name="upstash_redis_rest_url" value={settings.upstash_redis_rest_url ?? ""} />
          <input type="hidden" name="upstash_redis_rest_token" value={settings.upstash_redis_rest_token ?? ""} />
          <button
            type="submit"
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "var(--admin-hover-bg)",
              color: "var(--admin-text)",
              border: "1px solid var(--admin-card-border)",
            }}>
            {isTesting ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
            {isTesting ? "Test in corso..." : "Testa connessione Redis"}
          </button>
        </form>
      </div>

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
