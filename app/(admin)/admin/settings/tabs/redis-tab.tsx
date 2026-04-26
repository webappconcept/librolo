"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import { Eye, EyeOff, Loader2, Save, Wifi } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  saveRedisSettings,
  testRedisConnection,
  type ActionState,
} from "../actions";

export function RedisTab({ settings }: { settings: AppSettings }) {
  const [showToken, setShowToken] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const urlRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  const [saveState, saveAction, isSaving] = useActionState<
    ActionState,
    FormData
  >(saveRedisSettings, {});
  const [testState, testAction, isTesting] = useActionState<
    ActionState,
    FormData
  >(testRedisConnection, {});

  const lastSaveTs = useRef<number>(0);
  const lastTestTs = useRef<number>(0);

  useEffect(() => {
    if (!("timestamp" in saveState)) return;
    if (saveState.timestamp === lastSaveTs.current) return;
    lastSaveTs.current = saveState.timestamp;
    if ("success" in saveState)
      setToast({ message: saveState.success, type: "success" });
    if ("error" in saveState)
      setToast({ message: saveState.error, type: "error" });
  }, [saveState]);

  useEffect(() => {
    if (!("timestamp" in testState)) return;
    if (testState.timestamp === lastTestTs.current) return;
    lastTestTs.current = testState.timestamp;
    if ("success" in testState)
      setToast({ message: testState.success, type: "success" });
    if ("error" in testState)
      setToast({ message: testState.error, type: "error" });
  }, [testState]);

  const tokenMasked = settings.upstash_redis_rest_token
    ? settings.upstash_redis_rest_token.slice(0, 8) + "????????????????"
    : "";

  function handleTest() {
    const fd = new FormData();
    fd.append("upstash_redis_rest_url", urlRef.current?.value ?? "");
    fd.append("upstash_redis_rest_token", tokenRef.current?.value ?? "");
    testAction(fd);
  }

  return (
    <>
      <div className="space-y-6">
        <form action={saveAction} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="upstash_redis_rest_url"
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--admin-text-muted)" }}>
              REST URL
            </label>
            <input
              ref={urlRef}
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
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--admin-accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--admin-card-border)")
              }
            />
            <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              Find it in Upstash Console → Database → REST API → Endpoint
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
                ref={tokenRef}
                id="upstash_redis_rest_token"
                name="upstash_redis_rest_token"
                type={showToken ? "text" : "password"}
                defaultValue={settings.upstash_redis_rest_token ?? ""}
                placeholder={tokenMasked || "AX????????????????"}
                className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm font-mono"
                style={{
                  background: "var(--admin-input-bg)",
                  border: "1px solid var(--admin-card-border)",
                  color: "var(--admin-text)",
                  outline: "none",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--admin-accent)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--admin-card-border)")
                }
              />
              <button
                type="button"
                aria-label={showToken ? "Hide token" : "Show token"}
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                style={{ color: "var(--admin-text-muted)" }}>
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              Find it in Upstash Console → Database → REST API → Read/Write
              Token
            </p>
          </div>

          {/* Updated Info Box */}
          <div
            className="flex gap-3 px-4 py-3 rounded-lg text-xs"
            style={{
              background:
                "color-mix(in oklch, var(--admin-accent) 6%, var(--admin-card-bg))",
              border:
                "1px solid color-mix(in oklch, var(--admin-accent) 20%, transparent)",
            }}>
            <Wifi
              size={14}
              className="shrink-0 mt-0.5"
              style={{ color: "var(--admin-accent)" }}
            />
            <div className="space-y-2">
              <p style={{ color: "var(--admin-text-muted)" }}>
                These credentials are used by the{" "}
                <strong style={{ color: "var(--admin-text)" }}>
                  Bloom Filter
                </strong>{" "}
                to check emails and usernames directly on Upstash Redis.
              </p>
              <p style={{ color: "var(--admin-text-muted)" }}>
                <span
                  className="font-semibold"
                  style={{ color: "var(--admin-accent)" }}>
                  Note:
                </span>{" "}
                The system automatically manages the
                <code
                  className="mx-1 px-1 rounded"
                  style={{
                    background: "var(--admin-card-border)",
                    color: "var(--admin-text)",
                  }}>
                  bloom:emails
                </code>
                and
                <code
                  className="mx-1 px-1 rounded"
                  style={{
                    background: "var(--admin-card-border)",
                    color: "var(--admin-text)",
                  }}>
                  bloom:usernames
                </code>
                keys on Redis (type{" "}
                <span className="italic">String/Bitmap</span>).
              </p>
              <p style={{ color: "var(--admin-text-muted)" }}>
                The same Database is also used to record the rate limiting
                actions for Emails and IP.
              </p>
            </div>
          </div>

          {/* Action Buttons: Save + Test */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) =>
                !isSaving &&
                (e.currentTarget.style.background = "var(--admin-accent-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--admin-accent)")
              }>
              {isSaving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isSaving ? "Saving…" : "Save credentials"}
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "var(--admin-hover-bg)",
                color: "var(--admin-text)",
                border: "1px solid var(--admin-card-border)",
              }}
              onMouseEnter={(e) =>
                !isTesting &&
                (e.currentTarget.style.background =
                  "var(--admin-sidebar-item-hover-bg)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--admin-hover-bg)")
              }>
              {isTesting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Wifi size={15} />
              )}
              {isTesting ? "Testing..." : "Test connection"}
            </button>
          </div>
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
