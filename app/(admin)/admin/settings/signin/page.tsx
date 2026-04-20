import { getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { SigninTab } from "../tabs/signin-tab";

export const metadata: Metadata = { title: "Impostazioni / Accesso" };

export default async function SettingsSigninPage() {
  const settings = await getAppSettings();
  return <SigninTab settings={settings} />;
}
