import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Login } from "../login";
import { connection } from "next/server";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return generatePageMetadata("/sign-up");
}

export default function SignUpPage() {
  return (
    <Suspense>
      <Login mode="signup" isMaintenance={false} />
    </Suspense>
  );
}
