// app/(admin)/admin/sign-in/layout.tsx
// Layout MINIMALE per /admin/sign-in — nessun RBAC guard.
// Impedisce che il layout (protected) sopra venga applicato a questa route.
export default function AdminSignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
