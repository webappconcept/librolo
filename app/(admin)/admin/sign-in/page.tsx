// app/(admin)/admin/sign-in/page.tsx
import type { Metadata } from "next";
import AdminLoginForm from "./_components/admin-login-form";

export const metadata: Metadata = { title: "Accesso" };

export default function AdminSignInPage() {
  return <AdminLoginForm />;
}
