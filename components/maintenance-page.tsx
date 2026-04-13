// components/maintenance-page.tsx
// Componente statico — nessuna query DB, nessun import pesante.
// Viene renderizzato dal RootLayout quando maintenance_mode = "true"
// su tutte le route NON admin.

export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "#f8f7f4",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          padding: "3rem 2.5rem",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid #ece9e4",
        }}
      >
        <div style={{ fontSize: "2.75rem", marginBottom: "1rem" }}>🔧</div>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#1a1916",
            marginBottom: "0.625rem",
            lineHeight: 1.3,
          }}
        >
          Sito in manutenzione
        </h1>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "#6b6a67",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          Stiamo lavorando per migliorare la tua esperienza.
          <br />
          Torna a trovarci a breve.
        </p>
      </div>
    </div>
  );
}
