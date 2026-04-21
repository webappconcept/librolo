import { getAllSnippets } from "@/lib/db/snippets-queries";
import type { Metadata } from "next";
import { SnippetsTab } from "../tabs/snippets-tab";

export const metadata: Metadata = { title: "Settings / Snippets" };

export default async function SettingsContenutiPage() {
  const snippets = await getAllSnippets();
  return <SnippetsTab initialSnippets={snippets} />;
}
