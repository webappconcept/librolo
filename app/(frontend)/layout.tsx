/**
 * Layout isolato per il frontend pubblico.
 *
 * Si occupa solo del CSS specifico del frontend.
 * Gli snippet globali (head/body_end) sono iniettati dal RootLayout
 * in app/layout.tsx, che è l'unico posto in cui next/script
 * strategy="beforeInteractive" viene hoistato nel <head> reale.
 */
import "./frontend.css";

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
