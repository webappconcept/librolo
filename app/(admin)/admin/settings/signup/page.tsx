import { db } from "@/lib/db/drizzle";
import { roles } from "@/lib/db/schema";
import { getAppSettings } from "@/lib/db/settings-queries";
import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { SignInTab } from "../tabs/signin-tab";

export const metadata: Metadata = { title: "Settings / SignUp" };

export default async function SettingsSignInPage() {
  const [settings, allRoles] = await Promise.all([
    getAppSettings(),
    db.select().from(roles).orderBy(asc(roles.sortOrder)),
  ]);
  return <SignInTab settings={settings} roles={allRoles} />;
}
