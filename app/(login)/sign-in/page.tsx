import { generatePageMetadata } from "@/lib/seo";
import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import { Login } from "../login";
import type { Metadata } from "next";
import { connection } from "next/server";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return generatePageMetadata("/sign-in");
}

async function SignInContent() {
  const settings = await getAppSettings();
  const isMaintenance = settings.maintenance_mode === "true";
  return <Login mode="signin" isMaintenance={isMaintenance} />;
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
