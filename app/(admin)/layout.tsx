// app/(admin)/layout.tsx
// Questo layout wrappa TUTTO il gruppo (admin):
// - /admin/sign-in  → solo font + bg, NESSUNA shell/sidebar
// - /admin/*        → la shell completa è nel layout interno app/(admin)/admin/layout.tsx
import { Manrope } from "next/font/google";
import "./admin.css";

const manrope = Manrope({ subsets: ["latin"] });

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-[#f1f5f9] ${manrope.className}`}>
      {children}
    </div>
  );
}
