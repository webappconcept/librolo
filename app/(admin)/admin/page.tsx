// app/(admin)/admin/page.tsx
// TEMPORANEO — pagina svuotata per debug.
// Nessuna query DB, nessun componente.
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Dashboard</h1>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>Pagina di test — nessuna query DB.</p>
    </div>
  );
}
