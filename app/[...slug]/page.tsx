/**
 * DEPRECATO — questa route è stata sostituita da app/(frontend)/[...slug]/page.tsx
 * che usa il sistema registry dei template.
 *
 * Questo file esiste solo per non lasciare la cartella vuota e viene
 * rimosso non appena Next.js permette di eliminare route-group tramite API.
 *
 * Non aggiungere logica qui.
 */
import { notFound } from "next/navigation";

export default function DeprecatedSlugRoute() {
  return notFound();
}
