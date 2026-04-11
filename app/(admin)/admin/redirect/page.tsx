import { getRedirects } from "@/lib/db/redirects-queries";
import { redirect } from "next/navigation";
import { deleteRedirectAction, upsertRedirectAction } from "./actions";
import RedirectsClient from "./_components/redirects-client";

export const metadata = { title: "Redirect | Admin" };

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
