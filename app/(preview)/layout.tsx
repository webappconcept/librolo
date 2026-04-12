// app/(preview)/layout.tsx
// Route group isolato per /admin/preview/*
// NON eredita il layout admin (niente sidebar, niente topbar).
// Include solo il CSS admin per i colori della PreviewBar e il font.
import { Manrope } from "next/font/google";
import "@/app/(admin)/admin.css";

const manrope = Manrope({ subsets: ["latin"] });

export default function PreviewRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={manrope.className} style={{ minHeight: "100dvh" }}>
      {children}
    </div>
  );
}
