// app/(admin)/admin/seo/page.tsx
// Redirect automatico a /admin/seo/meta-tags (prima tab)
import { redirect } from "next/navigation";

export default function SeoIndexPage() {
  redirect("/admin/seo/meta-tags");
}
