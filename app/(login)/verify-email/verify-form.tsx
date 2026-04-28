// app/(login)/verify-email/verify-form.tsx
//
// Form client per inserire il codice OTP. Renderizzato dalla page server
// solo quando il cookie pending_verification_user_id è presente — la page
// fa il redirect a /sign-in se non c'è, così l'URL non è raggiungibile
// fuori dal flusso di registrazione.

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionState } from "@/lib/auth/middleware";
import { Loader2, Mail, RotateCcw, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { resendVerificationEmail, verifyEmail } from "./actions";

export function VerifyEmailForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    verifyEmail,
    { error: "" },
  );

  const [resendState, resendAction, resendPending] = useActionState<
    ActionState,
    FormData
  >(resendVerificationEmail, { error: "" });

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCode = [...code];
    pasted.split("").forEach((char, i) => {
      newCode[i] = char;
    });
    setCode(newCode);
    const nextEmpty = newCode.findIndex((c) => !c);
    inputRefs.current[nextEmpty !== -1 ? nextEmpty : 5]?.focus();
  };

  const fullCode = code.join("");

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12 bg-brand-bg">
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8 shadow-sm border border-brand-border bg-brand-surface">
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-brand-bg">
              <Mail className="h-6 w-6 text-brand-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-1 text-brand-text">
              Verifica la tua email
            </h1>
            <p className="text-sm text-brand-text-muted">
              Abbiamo inviato un codice a 6 cifre al tuo indirizzo email.
              Inseriscilo qui sotto per completare la registrazione.
            </p>
          </div>

          {/* Form verifica */}
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="code" value={fullCode} />

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-brand-label">
                Codice di verifica
              </Label>

              <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold px-0"
                    aria-label={`Cifra ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {state?.error && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-brand-error-bg text-brand-destructive">
                <X className="h-4 w-4 shrink-0" />
                {state.error}
              </div>
            )}

            <Button
              type="submit"
              disabled={pending || fullCode.length < 6}
              className="w-full">
              {pending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" /> Verifica in
                  corso...
                </>
              ) : (
                "Verifica email"
              )}
            </Button>
          </form>

          {/* Re-invio */}
          <div className="mt-6 pt-6 border-t border-brand-border">
            <p className="text-sm text-center mb-3 text-brand-text-muted">
              Non hai ricevuto il codice?
            </p>
            <form action={resendAction}>
              <Button
                type="submit"
                variant="ghost"
                disabled={resendPending}
                className="w-full text-brand-primary">
                {resendPending ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" /> Invio in
                    corso...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> Invia di nuovo il codice
                  </>
                )}
              </Button>
            </form>

            {resendState?.success && (
              <p className="text-xs text-center mt-2 text-brand-accent-hover">
                {resendState.success}
              </p>
            )}
            {resendState?.error && (
              <p className="text-xs text-center mt-2 text-brand-destructive">
                {resendState.error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
