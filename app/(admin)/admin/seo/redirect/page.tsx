// app/(admin)/admin/redirect/page.tsx
import type { Metadata } from "next";
import { getRedirects } from "@/lib/db/redirects-queries";
import { deleteRedirectAction, upsertRedirectAction } from "./actions";
import RedirectsClient from "./_components/redirects-client";

export const metadata: Metadata = { title: "Redirect" };

export default async function RedirectsPage() {
  const rows = await getRedirects();
  return (
    <RedirectsClient
      rows={rows}
      deleteAction={deleteRedirectAction}
      upsertAction={upsertRedirectAction}
    />
  );
}
