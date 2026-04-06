// app/(auth)/sign-up/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import { Login } from "../login";

async function SignUpContent() {
  const settings = await getAppSettings();
  const registrationsEnabled = settings.registrations_enabled === "true";

  return <Login mode="signup" registrationsEnabled={registrationsEnabled} />;
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
