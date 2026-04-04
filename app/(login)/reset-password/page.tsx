// app/(login)/reset-password/page.tsx
import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-brand-bg">
          <div className="w-12 h-12 rounded-full border-2 border-brand-border border-t-brand-primary animate-spin" />
        </div>
      }>
      <ResetPasswordForm />
    </Suspense>
  );
}
