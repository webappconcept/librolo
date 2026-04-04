"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionState } from "@/lib/auth/middleware";
import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";

const passwordRules = [
  {
    id: "min",
    label: "Almeno 8 caratteri",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "max",
    label: "Massimo 30 caratteri",
    test: (p: string) => p.length <= 30,
  },
  {
    id: "upper",
    label: "Almeno una lettera maiuscola",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "number",
    label: "Almeno un numero",
    test: (p: string) => /[0-9]/.test(p),
  },
];

export function Login({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const priceId = searchParams.get("priceId");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === "signin" ? signIn : signUp,
    { error: "" },
  );

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("");
      return;
    }
    setEmailError(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? ""
        : "Inserisci un indirizzo email valido",
    );
  };

  const validateConfirm = (value: string) => {
    if (!value) {
      setConfirmError("");
      return;
    }
    setConfirmError(value === password ? "" : "Le password non coincidono");
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12 bg-brand-bg">
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8 shadow-sm border border-brand-border bg-brand-surface">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-1 text-brand-text">
              {mode === "signin" ? "Bentornato" : "Crea un account"}
            </h1>
            <p className="text-sm text-brand-text-muted">
              {mode === "signin"
                ? "Inserisci le tue credenziali per accedere"
                : "Compila il modulo per registrarti"}
            </p>
          </div>

          <form className="space-y-5" action={formAction}>
            <input type="hidden" name="redirect" value={redirect || ""} />
            <input type="hidden" name="priceId" value={priceId || ""} />

            {/* EMAIL */}
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateEmail(e.target.value);
                }}
                required
                maxLength={50}
                placeholder="nome@esempio.com"
                aria-invalid={!!emailError}
              />
              {emailError && (
                <p className="text-xs flex items-center gap-1 text-brand-destructive">
                  <X className="h-3 w-3" /> {emailError}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wide text-brand-label">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (confirmPassword) validateConfirm(confirmPassword);
                }}
                required
                minLength={8}
                maxLength={30}
                placeholder="••••••••"
              />
              {mode === "signup" && password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <li
                        key={rule.id}
                        className={`text-xs flex items-center gap-1.5 transition-colors duration-200 ${
                          passed
                            ? "text-brand-accent-hover"
                            : "text-brand-text-light"
                        }`}>
                        {passed ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
              {mode === "signup" && password.length === 0 && (
                <ul className="mt-2 space-y-1">
                  {passwordRules.map((rule) => (
                    <li
                      key={rule.id}
                      className="text-xs flex items-center gap-1.5 text-brand-text-light">
                      <span className="w-3 text-center">•</span> {rule.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* CONFERMA PASSWORD */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-semibold uppercase tracking-wide text-brand-label">
                  Conferma password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    validateConfirm(e.target.value);
                  }}
                  required
                  minLength={8}
                  maxLength={30}
                  placeholder="••••••••"
                  aria-invalid={!!confirmError}
                  className={
                    confirmPassword && !confirmError
                      ? "border-brand-accent"
                      : ""
                  }
                />
                {confirmError && (
                  <p className="text-xs flex items-center gap-1 text-brand-destructive">
                    <X className="h-3 w-3" /> {confirmError}
                  </p>
                )}
                {confirmPassword && !confirmError && (
                  <p className="text-xs flex items-center gap-1 text-brand-accent-hover">
                    <Check className="h-3 w-3" /> Le password coincidono
                  </p>
                )}
              </div>
            )}

            {mode === "signin" && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-text-muted hover:text-brand-primary underline-offset-2 hover:underline">
                  Password dimenticata?
                </Link>
              </div>
            )}

            {state?.error && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-brand-error-bg text-brand-destructive">
                <X className="h-4 w-4 shrink-0" />
                {state.error}
              </div>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" /> Caricamento...
                </>
              ) : mode === "signin" ? (
                "Accedi"
              ) : (
                "Registrati"
              )}
            </Button>
          </form>

          {/* FOOTER */}
          <div className="mt-6 text-center">
            <span className="text-sm text-brand-text-muted">
              {mode === "signin"
                ? "Non hai un account? "
                : "Hai già un account? "}
            </span>
            <Link
              href={`${mode === "signin" ? "/sign-up" : "/sign-in"}${redirect ? `?redirect=${redirect}` : ""}${priceId ? `&priceId=${priceId}` : ""}`}
              className="text-sm font-semibold underline-offset-2 hover:underline text-brand-primary">
              {mode === "signin" ? "Registrati" : "Accedi"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
