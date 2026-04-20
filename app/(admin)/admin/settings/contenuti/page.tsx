// app/(admin)/admin/settings/contenuti/page.tsx
import { getAllSnippets } from "@/lib/db/snippets-queries";
import { SnippetsTab } from "../tabs/snippets-tab";

export default async function SettingsContenutiPage() {
  const snippets = await getAllSnippets();
  return <SnippetsTab initialSnippets={snippets} />;
}
