import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import HomeClient from "./home-client";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/");
}

export default function HomePage() {
  return <HomeClient />;
}
