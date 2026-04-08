import { generatePageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/sign-in";
  return generatePageMetadata(pathname);
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
