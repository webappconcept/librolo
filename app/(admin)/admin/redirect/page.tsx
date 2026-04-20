// app/(admin)/admin/redirect/page.tsx
import type { Metadata } from "next";
import { getRedirects } from "@/lib/db/redirects-queries";
import { deleteRedirectAction, upsertRedirectAction } from "./actions";
import RedirectsClient from "./_components/redirects-client";
import { SeoHeader } from "@/app/(admin)/admin/seo/_components/seo-header";

export const metadata: Metadata = { title: "SEO / Redirect" };

export default async function RedirectsPage() {
  const rows = await getRedirects();
  return (
    <div className="space-y-5">
      <SeoHeader />
      <RedirectsClient
        rows={rows}
        deleteAction={deleteRedirectAction}
        upsertAction={upsertRedirectAction}
      />
    </div>
  );
}
