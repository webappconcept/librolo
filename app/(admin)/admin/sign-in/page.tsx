// app/(admin)/admin/sign-in/page.tsx
// Pagina di login dedicata agli amministratori.
// Usa lo stesso componente Login ma con redirect verso /admin dopo il login.
import { AdminLogin } from "@/app/(admin)/admin/sign-in/admin-login";

export default function AdminSignInPage() {
  return <AdminLogin />;
}
