// app/(admin)/admin/settings/signin/page.tsx
import { db } from "@/lib/db/drizzle";
import { roles } from "@/lib/db/schema";
import { getAppSettings } from "@/lib/db/settings-queries";
import { asc } from "drizzle-orm";
import { SignInTab } from "../tabs/signin-tab";

export default async function SettingsSignInPage() {
  const [settings, allRoles] = await Promise.all([
    getAppSettings(),
    db.select().from(roles).orderBy(asc(roles.sortOrder)),
  ]);
  return <SignInTab settings={settings} roles={allRoles} />;
}
