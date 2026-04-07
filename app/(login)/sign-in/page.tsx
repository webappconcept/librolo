import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import { Login } from "../login";

async function SignInContent() {
  const settings = await getAppSettings();
  const isMaintenance = settings.maintenance_mode === "true";

  return (
    <>
      {isMaintenance && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#92400e",
            textAlign: "center",
          }}>
          🔧 Il sito è in manutenzione. Solo gli amministratori possono accedere.
        </div>
      )}
      <Login mode="signin" />
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
