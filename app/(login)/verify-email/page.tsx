// app/(login)/verify-email/page.tsx
//
// Server component che fa da guard per la pagina di verifica email.
// Il flusso di registrazione setta un cookie httpOnly
// `pending_verification_user_id` (UUID, TTL 20 min). Se quel cookie non è
// presente, la pagina non ha senso: redirect a /sign-in invece di mostrare
// un form vuoto a chi è capitato qui per errore.
//
// Le server action verifyEmail / resendVerificationEmail comunque gestiscono
// l'assenza del cookie come "Sessione scaduta", quindi questo è un layer
// di UX in più, non di sicurezza.

import { cookies } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "./verify-form";

export const metadata: Metadata = { title: "Verifica email" };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function VerifyEmailPage() {
  const jar = await cookies();
  const pending = jar.get("pending_verification_user_id")?.value;

  // Cookie assente o malformato → fuori dal flusso di registrazione
  if (!pending || !UUID_REGEX.test(pending)) {
    redirect("/sign-in");
  }

  return <VerifyEmailForm />;
}
