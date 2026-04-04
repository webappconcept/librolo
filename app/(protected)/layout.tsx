// app/(dashboard)/layout.tsx
import AppNav from "@/components/app-nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-brand-bg">
      <AppNav /> {/* nessuna prop */}
      <main className="pt-16 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
