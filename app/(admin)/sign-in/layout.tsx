// app/(admin)/sign-in/layout.tsx
// Layout minimale per /admin/sign-in — nessun guard RBAC.
// Importa solo il CSS admin per avere lo stesso look del pannello.
import "@/app/(admin)/admin.css";

export default function AdminSignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
