import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import { Login } from "../login";

async function SignInContent() {
  const settings = await getAppSettings();
  const isMaintenance = settings.maintenance_mode === "true";
  return <Login mode="signin" isMaintenance={isMaintenance} />;
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
