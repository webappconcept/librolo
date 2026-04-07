import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import { Login } from "../login";

async function SignUpContent() {
  const settings = await getAppSettings();
  const isMaintenance = settings.maintenance_mode === "true";
  const registrationsEnabled = settings.registrations_enabled === "true";

  if (isMaintenance) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div
          style={{
            background: "#fff",
            borderRadius: "1rem",
            padding: "2.5rem 2rem",
            maxWidth: "420px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔧</div>
          <h2
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              color: "#111",
              marginBottom: "0.5rem",
            }}>
            Registrazioni sospese
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.6 }}>
            Il sito è temporaneamente in manutenzione.
            <br />
            Le registrazioni riapriranno a breve.
          </p>
        </div>
      </div>
    );
  }

  return <Login mode="signup" registrationsEnabled={registrationsEnabled} />;
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
