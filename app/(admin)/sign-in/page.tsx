// app/(admin)/sign-in/page.tsx
// Pagina di login dedicata agli amministratori.
// Risiede FUORI da app/(admin)/admin/ per non essere coperta
// dal layout RBAC (requireAdminPage) che wrappa tutto /admin/*.
// URL risultante: /admin/sign-in (invariato).
import { AdminLogin } from "@/app/(admin)/admin/sign-in/admin-login";

export default function AdminSignInPage() {
  return <AdminLogin />;
}
