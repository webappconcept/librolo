// app/(login)/forgot-password/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionState } from "@/lib/auth/middleware";
import { Check, KeyRound, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    forgotPassword,
    { error: "" },
  );

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12 bg-brand-bg">
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8 shadow-sm border border-brand-border bg-brand-surface">
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-brand-bg">
              <KeyRound className="h-6 w-6 text-brand-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-1 text-brand-text">
              Password dimenticata?
            </h1>
            <p className="text-sm text-brand-text-muted">
              Inserisci la tua email e ti invieremo un link per reimpostare la
              password.
            </p>
          </div>

          {state?.success ? (
            <div className="rounded-xl px-4 py-4 flex items-start gap-3 bg-brand-accent-light">
              <Check className="h-5 w-5 mt-0.5 shrink-0 text-brand-accent-hover" />
              <p className="text-sm text-brand-text">{state.success}</p>
            </div>
          ) : (
            <form action={formAction} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wide text-brand-label">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="nome@esempio.com"
                />
              </div>

              {state?.error && (
                <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-brand-error-bg text-brand-destructive">
                  <X className="h-4 w-4 shrink-0" />
                  {state.error}
                </div>
              )}

              <Button type="submit" disabled={pending} className="w-full">
                {pending ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" /> Invio in
                    corso...
                  </>
                ) : (
                  "Invia link di reset"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/sign-in"
              className="text-sm font-semibold underline-offset-2 hover:underline text-brand-primary">
              ← Torna al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
