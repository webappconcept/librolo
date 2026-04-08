import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Login } from "../login";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/sign-up");
}

export default function SignUpPage() {
  return (
    <Suspense>
      <Login mode="signup" isMaintenance={false} />
    </Suspense>
  );
}
