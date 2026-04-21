// app/(admin)/admin/users/_components/delete-modal.tsx
"use client";

import { Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteUser } from "../actions";

interface DeleteModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

export default function DeleteModal({
  userId,
  userName,
  userEmail,
  onClose,
}: DeleteModalProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfirmed =
    confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close with ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, pending]);

  function handleDelete() {
    if (!isConfirmed || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteUser(userId);
        onClose();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error. Please try again.",
        );
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => !pending && onClose()}
      />

      {/* Modal */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 bg-red-600">
          <TriangleAlert size={18} className="text-white shrink-0" />
          <h3 className="text-white font-semibold text-sm flex-1 leading-tight">
            Permanently delete user
          </h3>
          <button
            onClick={() => !pending && onClose()}
            className="text-red-100 hover:text-white transition-colors p-1 rounded"
            aria-label="Close"
            disabled={pending}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Warning box */}
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{
              background:
                "color-mix(in srgb, #ef4444 7%, var(--admin-card-bg))",
              border: "1px solid color-mix(in srgb, #ef4444 25%, transparent)",
            }}>
            <TriangleAlert size={15} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-600 mb-1">
                Irreversible action
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--admin-text-muted)" }}>
                You are about to soft-delete{" "}
                <strong style={{ color: "var(--admin-text)" }}>
                  {userName}
                </strong>
                . The account will be deactivated and the user will receive a
                notification via email.
              </p>
            </div>
          </div>

          {/* Email confirmation */}
          <div className="space-y-2">
            <label
              htmlFor="delete-confirm-email"
              className="text-xs font-medium"
              style={{ color: "var(--admin-text-muted)" }}>
              Type the user&apos;s email to confirm:
            </label>
            <code
              className="block text-xs px-3 py-2 rounded-lg select-all cursor-text"
              style={{
                background: "var(--admin-page-bg)",
                color: "var(--admin-text)",
                border: "1px solid var(--admin-divider)",
              }}>
              {userEmail}
            </code>
            <input
              ref={inputRef}
              id="delete-confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && isConfirmed && handleDelete()
              }
              placeholder="Paste or type email..."
              autoComplete="off"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
              style={{
                background: "var(--admin-page-bg)",
                border: `1px solid ${
                  isConfirmed
                    ? "#22c55e"
                    : confirmEmail.length > 0
                      ? "#ef4444"
                      : "var(--admin-input-border)"
                }`,
                color: "var(--admin-text)",
              }}
            />
          </div>

          {/* Server error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex justify-end gap-2"
          style={{ borderTop: "1px solid var(--admin-divider)" }}>
          <button
            onClick={() => !pending && onClose()}
            disabled={pending}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: "var(--admin-hover-bg)",
              color: "var(--admin-text-muted)",
            }}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || pending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{
              background: isConfirmed && !pending ? "#dc2626" : "#9ca3af",
            }}>
            {pending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={13} />
                Delete permanently
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
