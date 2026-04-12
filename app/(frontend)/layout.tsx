/**
 * Layout isolato per il frontend pubblico.
 * NON eredita font, variabili CSS o classi dell'admin.
 * I template hanno controllo totale sul proprio stile.
 */
import "./frontend.css";

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
