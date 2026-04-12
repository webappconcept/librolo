// app/(admin)/admin/preview/layout.tsx
// Layout intenzionalmente vuoto: sovrascrive app/(admin)/admin/layout.tsx
// per le route /admin/preview/* in modo da NON renderizzare
// la shell admin (sidebar, topbar, ecc.).
// I children vengono montati direttamente sul body — la preview
// ha solo la propria PreviewBar + il template frontend.
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        // Reset completo: usa i font e i colori del frontend, non dell'admin
        all: "initial",
        display: "block",
        minHeight: "100dvh",
        fontFamily: "inherit",
      }}
    >
      {children}
    </div>
  );
}
