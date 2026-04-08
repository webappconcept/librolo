import { generatePageMetadata } from "@/lib/seo";
import { getSession } from "@/lib/auth/session";
import LandingPage from "@/components/landing-page";
import HomeClient from "./home-client";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/");
}

export default async function HomePage() {
  const session = await getSession();

  // Utente non loggato: mostra landing direttamente dal server
  // così i meta sono già nel <head> prima dello stream del body
  if (!session) {
    return <LandingPage />;
  }

  // Utente loggato: monta il client component con SWR per i dati
  return <HomeClient />;
}
