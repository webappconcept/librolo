// app/(admin)/admin/sign-in/page.tsx
import type { Metadata } from "next";
import AdminLogin from "./admin-login";

export const metadata: Metadata = { title: "Accesso" };

export default function AdminSignInPage() {
  return <AdminLogin />;
}
