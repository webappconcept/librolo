import { getSystemPageSlugs } from "@/lib/db/pages-queries";
import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Login } from "../login";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/sign-up");
}

export default async function SignUpPage() {
  const systemPageSlugs = await getSystemPageSlugs();

  return (
    <Suspense>
      <Login
        mode="signup"
        isMaintenance={false}
        systemPageSlugs={systemPageSlugs}
      />
    </Suspense>
  );
}
