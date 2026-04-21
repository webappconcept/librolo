// app/(admin)/admin/settings/page.tsx
// Redirect immediato alla prima sottosezione
import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/admin/settings/general");
}
