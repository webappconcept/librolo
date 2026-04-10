import PageEditor from "../_components/page-editor";

export const dynamic = "force-dynamic";

export default function NewPagePage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--admin-text)" }}>
          Nuova pagina
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
          Crea una nuova pagina statica per il sito.
        </p>
      </div>
      <div
        className="rounded-xl shadow-sm p-5"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}
      >
        <PageEditor />
      </div>
    </div>
  );
}
