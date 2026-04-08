// app/(admin)/admin/layout.tsx
// Layout di gruppo per /admin/* — importa solo il CSS admin.
// Il guard RBAC è nel layout (protected) che wrappa le pagine protette.
import "@/app/(admin)/admin.css";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
