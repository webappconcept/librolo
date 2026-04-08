import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Terminal } from "./terminal";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/");
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Terminal />
    </Suspense>
  );
}
